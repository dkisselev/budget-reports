import * as ynab from "ynab";
import moment from "moment";
import get from "lodash/fp/get";
import matches from "lodash/fp/matches";
import { camelCaseKeys, getStorage, setStorage } from "./utils";
import { setLastUpdated, getLastUpdated } from "./uiRepo";
import { sanitizeBudget, mergeBudgets } from "./repoUtils";
import { getBudgetDetails, setBudgetDetails } from "./localBudgetCache";
import { clientId, redirectUri } from "./ynabConfig";

const TOKEN_STORAGE_KEY = "ynab_access_token";
const BUDGETS_STORAGE_KEY = "ynab_budgets";

const TIME_LIMIT_FOR_FULL_REFRESH = 8 * 1000;

export const AUTHORIZE_URL =
  "https://app.youneedabudget.com/oauth/authorize?client_id=" +
  clientId +
  "&redirect_uri=" +
  redirectUri +
  "&response_type=token";

export const getAuthorizeToken = () => {
  // check for hash route
  if (window.location.hash[1] === "/") {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  const search = window.location.hash
    .substring(1)
    .replace(/&/g, '","')
    .replace(/=/g, '":"');

  if (!search) {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  const token = get("access_token")(
    JSON.parse(
      '{"' + search + '"}',
      (key, value) => (key === "" ? value : decodeURIComponent(value))
    )
  );
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.location.hash = "";

  return token;
};

let api = null;

export const initializeYnabApi = token => {
  api = new ynab.api(token);
};

export const getBudgets = () => {
  const cachedBudgets = getStorage(BUDGETS_STORAGE_KEY);

  if (cachedBudgets) {
    return Promise.resolve(camelCaseKeys(cachedBudgets));
  } else {
    return api.budgets.getBudgets().then(({ data }) => {
      setStorage(BUDGETS_STORAGE_KEY, data);
      return camelCaseKeys(data);
    });
  }
};

const getBudget = id =>
  api.budgets.getBudgetById(id).then(({ data }) => {
    const { budget, server_knowledge } = data;

    setBudgetDetails({ id, budget, server_knowledge });
    setLastUpdated(id);

    return { budget: sanitizeBudget(budget), authorized: true };
  });

export const getUpdatedBudget = id => {
  const budgetDetails = getBudgetDetails(id);

  if (!budgetDetails) {
    return getBudget(id);
  }

  if (moment().valueOf() - getLastUpdated(id) < TIME_LIMIT_FOR_FULL_REFRESH) {
    return getBudget(id);
  }

  return api.budgets
    .getBudgetById(id, budgetDetails.server_knowledge)
    .then(({ data }) => {
      const budget = mergeBudgets(budgetDetails.budget, data.budget);

      setBudgetDetails({ id, budget, server_knowledge: data.server_knowledge });
      setLastUpdated(id);

      return { budget: sanitizeBudget(budget), authorized: true };
    })
    .catch(e => {
      if (
        matches({ id: "401", name: "unauthorized" })(e.error) ||
        e.message === "Failed to fetch"
      ) {
        return {
          budget: sanitizeBudget(budgetDetails.budget),
          authorized: false
        };
      }
    });
};

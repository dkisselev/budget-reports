import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { Route, Switch } from "react-router-dom";
import moment from "moment";
import keyBy from "lodash/fp/keyBy";
import { getBudgets, getUpdatedBudget, AUTHORIZE_URL } from "../ynabRepo";
import topLevelPages from "../topLevelPages";
import Unauthorized from "./Unauthorized";
import NotFound from "./NotFound";
import ErrorBoundary from "./ErrorBoundary";
import Budgets from "./Budgets";
import CategoryGroup from "./CategoryGroup";
import Category from "./Category";

const Container = styled.div`
  font-family: Roboto, Arial, "Helvetica Neue", Helvetica, sans-serif;
  color: #444;
  font-size: 14px;
  line-height: 22px;
  a {
    color: inherit;
    text-decoration: none;
  }
`;

class App extends Component {
  static propTypes = {
    hasToken: PropTypes.bool.isRequired
  };

  state = {
    authorized: true,
    budgetsLoaded: false,
    budgetIds: [],
    budgets: {},
    budgetDetails: {},
    currentMonth: moment().format("YYYY-MM")
  };

  handleRequestBudgets = callback => {
    getBudgets().then(({ budgets }) => {
      this.setState(
        {
          budgetsLoaded: true,
          budgetIds: budgets.map(b => b.id),
          budgets: keyBy("id")(budgets)
        },
        callback
      );
    });
  };

  handleRequestBudget = id => {
    getUpdatedBudget(id).then(({ budget, authorized }) => {
      this.setState(state => ({
        ...state,
        authorized,
        budgetDetails: {
          ...state.budgetDetails,
          [id]: budget
        }
      }));
    });
  };

  handleAuthorize = () => {
    window.location.replace(AUTHORIZE_URL);
  };

  render() {
    const { hasToken } = this.props;
    const {
      authorized,
      budgetsLoaded,
      budgetIds,
      budgets,
      budgetDetails,
      currentMonth
    } = this.state;

    if (!hasToken) {
      return <Unauthorized onAuthorize={this.handleAuthorize} />;
    }

    return (
      <Container>
        <ErrorBoundary>
          <Switch>
            <Route
              path="/"
              exact
              render={() => (
                <Budgets
                  budgetsLoaded={budgetsLoaded}
                  budgets={budgetIds.map(id => budgets[id])}
                  onRequestBudgets={this.handleRequestBudgets}
                />
              )}
            />
            {topLevelPages.map(({ path, title, Component }) => (
              <Route
                key={path}
                path={`/budgets/:budgetId${path}`}
                exact
                render={({ match }) => (
                  <Component
                    authorized={authorized}
                    budget={budgetDetails[match.params.budgetId]}
                    budgetId={match.params.budgetId}
                    title={title}
                    onAuthorize={this.handleAuthorize}
                    onRequestBudget={this.handleRequestBudget}
                  />
                )}
              />
            ))}
            <Route
              path="/budgets/:budgetId/category-groups/:categoryGroupId"
              exact
              render={({ match }) => (
                <CategoryGroup
                  budget={budgetDetails[match.params.budgetId]}
                  budgetId={match.params.budgetId}
                  categoryGroupId={match.params.categoryGroupId}
                  currentMonth={currentMonth}
                  onRequestBudget={this.handleRequestBudget}
                />
              )}
            />
            <Route
              path="/budgets/:budgetId/categories/:categoryId"
              exact
              render={({ match }) => (
                <Category
                  budget={budgetDetails[match.params.budgetId]}
                  budgetId={match.params.budgetId}
                  categoryId={match.params.categoryId}
                  currentMonth={currentMonth}
                  onRequestBudget={this.handleRequestBudget}
                />
              )}
            />
            <Route component={NotFound} />
          </Switch>
        </ErrorBoundary>
      </Container>
    );
  }
}

export default App;

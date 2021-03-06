import React, { Component } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { getBudgetLink } from "../utils";
import Loading from "./Loading";

class Budgets extends Component {
  static propTypes = {
    budgets: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      })
    ).isRequired,
    budgetsLoaded: PropTypes.bool.isRequired,
    onRequestBudgets: PropTypes.func.isRequired
  };

  componentDidMount() {
    if (!this.props.budgetsLoaded) {
      this.props.onRequestBudgets();
    }
  }

  render() {
    const { budgets, budgetsLoaded } = this.props;

    if (!budgetsLoaded) {
      return <Loading />;
    }

    return budgets.map(({ id, name }) => (
      <div key={id}>
        <Link to={getBudgetLink({ budgetId: id })}>{name}</Link>
      </div>
    ));
  }
}

export default Budgets;

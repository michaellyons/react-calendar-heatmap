import React, { PropTypes } from 'react';
import range from 'lodash.range';
import reduce from 'lodash.reduce';
import { DAYS_IN_WEEK, MILLISECONDS_IN_ONE_DAY, MONTH_LABELS } from './constants';
import { shiftDate, getBeginningTimeForDate, convertToDate } from './dateHelpers';

const SQUARE_SIZE = 10;
const MONTH_LABEL_GUTTER_SIZE = 4;

class CalendarHeatmap extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      valueCache: this.getValueCache(props.values),
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      valueCache: this.getValueCache(nextProps.values),
    });
  }

  handleClick(value) {
    if (this.props.onClick) {
      this.props.onClick(value);
    }
  }

  getSquareSizeWithGutter() {
    return SQUARE_SIZE + this.props.gutterSize;
  }

  getMonthLabelSize() {
    if (!this.props.showMonthLabels) {
      return 0;
    } else if (this.props.horizontal) {
      return SQUARE_SIZE + MONTH_LABEL_GUTTER_SIZE;
    } else {
      return 2 * SQUARE_SIZE + MONTH_LABEL_GUTTER_SIZE;
    }
  }

  getStartDate() {
    return shiftDate(this.getEndDate(), -this.props.numDays + 1); // +1 because endDate is inclusive
  }

  getEndDate() {
    return getBeginningTimeForDate(convertToDate(this.props.endDate));
  }

  getStartDateWithEmptyDays() {
    return shiftDate(this.getStartDate(), -this.getNumEmptyDaysAtStart());
  }

  getNumEmptyDaysAtStart() {
    return this.getStartDate().getDay();
  }

  getNumEmptyDaysAtEnd() {
    return (DAYS_IN_WEEK - 1) - this.getEndDate().getDay();
  }

  getWeekCount() {
    const numDaysRoundedToWeek = this.props.numDays + this.getNumEmptyDaysAtStart() + this.getNumEmptyDaysAtEnd();
    return Math.ceil(numDaysRoundedToWeek / DAYS_IN_WEEK);
  }

  getWeekWidth() {
    return DAYS_IN_WEEK * this.getSquareSizeWithGutter();
  }

  getWidth() {
    return this.getWeekCount() * this.getSquareSizeWithGutter() - this.props.gutterSize;
  }

  getHeight() {
    return this.getWeekWidth() + this.getMonthLabelSize() - this.props.gutterSize;
  }

  getValueCache(values) {
    return reduce(values, (memo, value) => {
      const date = convertToDate(value.date);
      const index = Math.floor((date - this.getStartDateWithEmptyDays()) / MILLISECONDS_IN_ONE_DAY);
      memo[index] = {
        value: value,
        className: this.props.classForValue(value),
        title: this.props.titleForValue ? this.props.titleForValue(value) : null,
      };
      return memo;
    }, {});
  }

  getValueForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].value;
    } else {
      return null;
    }
  }

  getClassNameForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].className;
    } else {
      return this.props.classForValue(null);
    }
  }

  getTitleForIndex(index) {
    if (this.state.valueCache[index]) {
      return this.state.valueCache[index].title;
    } else {
      return this.props.titleForValue ? this.props.titleForValue(null) : null;
    }
  }

  getTransformForWeek(weekIndex) {
    if (this.props.horizontal) {
      return `translate(${weekIndex * this.getSquareSizeWithGutter()}, 0)`;
    } else {
      return `translate(0, ${weekIndex * this.getSquareSizeWithGutter()})`;
    }
  }

  getTransformForMonthLabels() {
    if (this.props.horizontal) {
      return null;
    } else {
      return `translate(${this.getWeekWidth() + MONTH_LABEL_GUTTER_SIZE}, 0)`;
    }
  }

  getTransformForAllWeeks() {
    if (this.props.horizontal) {
      return `translate(0, ${this.getMonthLabelSize()})`;
    } else {
      return null;
    }
  }

  getViewBox() {
    if (this.props.horizontal) {
      return `0 0 ${this.getWidth()} ${this.getHeight()}`;
    } else {
      return `0 0 ${this.getHeight()} ${this.getWidth()}`;
    }
  }

  getSquareCoordinates(dayIndex) {
    if (this.props.horizontal) {
      return [0, dayIndex * this.getSquareSizeWithGutter()];
    } else {
      return [dayIndex * this.getSquareSizeWithGutter(), 0];
    }
  }

  getMonthLabelCoordinates(weekIndex) {
    if (this.props.horizontal) {
      return [
        weekIndex * this.getSquareSizeWithGutter(),
        this.getMonthLabelSize() - MONTH_LABEL_GUTTER_SIZE,
      ];
    } else {
      const verticalOffset = -2;
      return [
        0,
        (weekIndex + 1) * this.getSquareSizeWithGutter() + verticalOffset,
      ];
    }
  }

  renderSquare(dayIndex, index) {
    const indexOutOfRange = index < this.getNumEmptyDaysAtStart() || index >= this.getNumEmptyDaysAtStart() + this.props.numDays;
    if (indexOutOfRange && !this.props.showOutOfRangeDays) {
      return null;
    }
    const [x, y] = this.getSquareCoordinates(dayIndex);
    return (
      <rect
        key={index}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        x={x}
        y={y}
        title={this.getTitleForIndex(index)}
        className={this.getClassNameForIndex(index)}
        onClick={this.handleClick.bind(this, this.getValueForIndex(index))}
        {...this.props.tooltipDataAttrs}
      >
      </rect>
    );
  }

  renderWeek(weekIndex) {
    return (
      <g key={weekIndex} transform={this.getTransformForWeek(weekIndex)}>
        {range(DAYS_IN_WEEK).map((dayIndex) => this.renderSquare(dayIndex, weekIndex * DAYS_IN_WEEK + dayIndex))}
      </g>
    );
  }

  renderAllWeeks() {
    return range(this.getWeekCount()).map((weekIndex) => this.renderWeek(weekIndex));
  }

  renderMonthLabels() {
    if (!this.props.showMonthLabels) {
      return null;
    }
    const weekRange = range(this.getWeekCount() - 1);  // don't render for last week, because label will be cut off
    return weekRange.map((weekIndex) => {
      const endOfWeek = shiftDate(this.getStartDateWithEmptyDays(), (weekIndex + 1) * DAYS_IN_WEEK);
      const [x, y] = this.getMonthLabelCoordinates(weekIndex);
      return (endOfWeek.getDate() >= 1 && endOfWeek.getDate() <= DAYS_IN_WEEK) ? (
        <text
          key={weekIndex}
          x={x}
          y={y}
        >
          {MONTH_LABELS[endOfWeek.getMonth()]}
        </text>
      ) : null;
    });
  }

  render() {
    return (
      <svg
        className="react-calendar-heatmap"
        viewBox={this.getViewBox()}
      >
        <g transform={this.getTransformForMonthLabels()}>
          {this.renderMonthLabels()}
        </g>
        <g transform={this.getTransformForAllWeeks()}>
          {this.renderAllWeeks()}
        </g>
      </svg>
    );
  }
}

CalendarHeatmap.propTypes = {
  values: PropTypes.arrayOf(             // array of objects with date and arbitrary metadata
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]).isRequired,
    }).isRequired
  ).isRequired,
  numDays: PropTypes.number,             // number of days back from endDate to show
  endDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),  // end of date range
  gutterSize: PropTypes.number,          // size of space between squares
  horizontal: PropTypes.bool,            // whether to orient horizontally or vertically
  showMonthLabels: PropTypes.bool,       // whether to show month labels
  showOutOfRangeDays: PropTypes.bool,    // whether to render squares for extra days in week after endDate, and before start date
  tooltipDataAttrs: PropTypes.object,    // data attributes to add to square for setting 3rd party tooltips, e.g. { 'data-toggle': 'tooltip' } for bootstrap tooltips
  titleForValue: PropTypes.func,         // function which returns title text for value
  classForValue: PropTypes.func,         // function which returns html class for value
  onClick: PropTypes.func,               // callback function when a square is clicked
};

CalendarHeatmap.defaultProps = {
  numDays: 200,
  endDate: new Date(),
  gutterSize: 1,
  horizontal: true,
  showMonthLabels: true,
  showOutOfRangeDays: false,
  classForValue: (value) => {
    return value ? 'color-filled' : 'color-empty';
  },
};

export default CalendarHeatmap;

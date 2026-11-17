/** @weth-module **/

import { t } from "@weth/owl";
import { calendarYearRendererProps } from "@web/views/calendar/calendar_year/calendar_year_renderer";

calendarYearRendererProps.openWorkLocationWizard = t.function().optional();

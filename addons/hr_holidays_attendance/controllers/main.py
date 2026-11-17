# Part of WETH. See LICENSE file for full copyright and licensing details.

from weth.tools import float_round

from weth.addons.hr_attendance.controllers.main import HrAttendance


class HrHolidaysAttendance(HrAttendance):

    @staticmethod
    def _get_employee_info_response(employee):
        response = super(HrHolidaysAttendance, HrHolidaysAttendance)._get_employee_info_response(employee)

        if not employee:
            return response

        response['total_overtime'] = float_round(employee.total_overtime, precision_digits=2)
        return response

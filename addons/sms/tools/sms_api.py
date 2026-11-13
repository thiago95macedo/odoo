# Part of WETH. See LICENSE file for full copyright and licensing details.

from odoo.exceptions import UserError
from odoo.tools.translate import _, LazyTranslate

_lt = LazyTranslate(__name__)

ERROR_MESSAGES = {
    # Errors that could occur while updating sender name
    'format_error': _lt("Your sender name must be between 3 and 11 characters long and only contain alphanumeric characters."),
    'unregistered_account': _lt("Your sms account has not been activated yet."),
    'existing_sender': _lt("This account already has an existing sender name and it cannot be changed."),

    # Errors that could occur while sending the verification code
    'invalid_phone_number': _lt("Invalid phone number. Please make sure to follow the international format, i.e. a plus sign (+), then country code, city code, and local phone number. For example: +1 555-555-555"),
    'verification_sms_delivery': _lt(
        "We were not able to reach you via your phone number. "
        "If you have requested multiple codes recently, please retry later."
    ),
    'closed_feature': _lt("The SMS Service is currently unavailable for new users and new accounts registrations are suspended."),
    'banned_account': _lt("This phone number/account has been banned from our service."),
    'country_not_supported': _lt("Your country is not supported due to sender registration legislation"),
    'not_active_db': _lt("Your database is not activated"),

    # Errors that could occur while verifying the code
    'invalid_code': _lt("The verification code is incorrect."),
    'no_sms_account': _lt("We were not able to find your account in our database."),
    'too_many_attempts': _lt("You tried too many times. Please retry later."),

    # Default error
    'unknown_error': _lt("An unknown error occurred. Please contact Odoo support if this error persists."),
}


class SmsApiBase:
    PROVIDER_TO_SMS_FAILURE_TYPE = {
        'server_error': 'sms_server',
        'sms_number_missing': 'sms_number_missing',
        'wrong_number_format': 'sms_number_format',
        'country_not_supported': 'sms_country_not_supported',
        'insufficient_credit': 'sms_credit',
        'not_active_db': 'sms_database_non_active',
        'unregistered': 'sms_acc',
    }

    def __init__(self, env, account=None):
        self.env = env
        self.company = env.company

    def _get_sms_api_error_messages(self):
        """Return a mapping of `_send_sms_batch` errors to an error message."""
        return {
            'wrong_number_format': _("The number you're trying to reach is not correctly formatted."),
            'duplicate_message': _("This SMS has been removed as the number was already used."),
            'country_not_supported': _("The destination country is not supported."),
            'incompatible_content': _("The content of the message violates rules applied by our providers."),
        }

    def _send_sms_batch(self, messages, delivery_reports_url=False):
        raise UserError(_("No SMS provider is configured for sending SMS messages."))

    def _set_company(self, company):
        self.company = company


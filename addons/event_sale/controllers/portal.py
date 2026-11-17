from weth.addons.event.controllers.portal import EventPortal
from weth.fields import Domain
from weth.http import request


class WebsiteEventPortal(EventPortal):

    def _prepare_event_registrations_domain(self):
        """ Add registrations whose sales order belongs to the current user. """
        domain = super()._prepare_event_registrations_domain()
        # Sudo-ed to access owned registrations even without read access on their sale order.
        registration_ids = request.env['event.registration'].sudo()._search(
            [('sale_order_id.partner_id', '=', request.env.user.partner_id.id)]
        )
        return Domain.OR([
            domain,
            Domain('id', 'in', registration_ids),
        ])

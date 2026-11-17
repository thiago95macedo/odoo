import { mountComponent } from "@web/env";
import { whenReady } from "@weth/owl";
import { CustomerDisplay } from "@point_of_sale/customer_display/customer_display";

whenReady(() => mountComponent(CustomerDisplay, document.body));

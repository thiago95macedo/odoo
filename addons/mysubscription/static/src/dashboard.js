import { Component, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
import { PlanSection } from "./plan_section";
import { DatabaseSection } from "./database_section";
import { MySubscriptionNavBar } from "./components/navbar";

export class MySubscriptionDashboard extends Component {
    static template = "mysubscription.Dashboard";
    static target = "fullscreen";
    static components = {
        PlanSection,
        DatabaseSection,
        MySubscriptionNavBar,
    };

    setup() {
        this.orm = useService("orm");

        onWillStart(async () => {
            const data = await this.loadSubscription();
            this.enterpriseCode = data.enterprise_code;
            this.baseUrl = data.base_url;
            this.hasSubscription = data.has_subscription;
            this.showDatabaseAction = data.show_database_action;
        });
    }

    // Fetches expiration date and reason, base_url, is the user an admin and enterprise code
    async loadSubscription() {
        const configData = await this.orm.call(
            "mysubscription.mysubscription",
            "get_dashboard_data",
            []
        );
        return configData;
    }
}

registry.category("actions").add("mysubscription.dashboard", MySubscriptionDashboard);

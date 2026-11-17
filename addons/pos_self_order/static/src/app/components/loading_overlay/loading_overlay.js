import { Component, onMounted, proxy } from "@weth/owl";

export class LoadingOverlay extends Component {
    static template = "pos_self_order.LoadingOverlay";

    setup() {
        this.state = proxy({
            loading: false,
        });

        onMounted(() => {
            setTimeout(() => {
                this.state.loading = true;
            }, 200);
        });
    }
}

import { createApp } from "vue";
import App from "./App.vue";

import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/dsfr.module.min.js";

import router from "./router";

createApp(App).use(router).mount("#app");

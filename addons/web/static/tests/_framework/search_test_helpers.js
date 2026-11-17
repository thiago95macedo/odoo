import { queryAll, queryAllTexts, queryOne, queryText } from "@weth/hoot";
import { Component, xml } from "@weth/owl";
import { WithSearch } from "@web/search/with_search/with_search";
import { getDefaultConfig } from "@web/views/view";
import { assignTestEnv } from "./app_test_helpers";
import { findComponent, mountWithCleanup } from "./component_test_helpers";
import { contains } from "./dom_test_helpers";
import { isSmall } from "./ui_test_helpers";

const ensureSearchView = async () => {
    if (
        isSmall() &&
        queryAll`.w_control_panel_navigation`.length &&
        !queryAll`.w_searchview`.length
    ) {
        await contains(`.w_control_panel_navigation [data-icon="search"]`).click();
    }
};

const ensureSearchBarMenu = async () => {
    if (!queryAll`.w_search_bar_menu`.length) {
        await toggleSearchBarMenu();
    }
};

//-----------------------------------------------------------------------------
// Search view
//-----------------------------------------------------------------------------

/**
 * Mounts a component wrapped within a WithSearch.
 *
 * @template T
 * @param {T} componentConstructor
 * @param {Record<string, any>} [options]
 * @param {Record<string, any>} [config]
 * @returns {Promise<InstanceType<T>>}
 */
export async function mountWithSearch(componentConstructor, searchProps = {}, config = {}) {
    class ComponentWithSearch extends Component {
        static template = xml`
            <WithSearch t-props="this.withSearchProps" t-slot-scope="search">
                <t t-component="this.component" t-props="this.getProps(search)"/>
            </WithSearch>
        `;
        static components = { WithSearch };

        setup() {
            this.withSearchProps = searchProps;
            this.component = componentConstructor;
        }

        getProps(search) {
            // Every prop is forwarded: owl3 validation is loose, and a
            // component only ever sees the props it declares.
            return {
                context: search.context,
                domain: search.domain,
                groupBy: search.groupBy,
                orderBy: search.orderBy,
                comparison: search.comparison,
                display: search.display,
            };
        }
    }

    const fullConfig = { ...getDefaultConfig(), ...config };
    assignTestEnv({ config: fullConfig });
    const root = await mountWithCleanup(ComponentWithSearch);
    return findComponent(root, (component) => component instanceof componentConstructor);
}

//-----------------------------------------------------------------------------
// Menu (generic)
//-----------------------------------------------------------------------------

/**
 * @param {string} label
 */
export async function toggleMenu(label) {
    await contains(`button.w-dropdown:text(${label})`).click();
}

/**
 * @param {string} label
 */
export async function toggleMenuItem(label) {
    const target = queryOne`.w_menu_item:text(${label})`;
    if (target.classList.contains("dropdown-toggle")) {
        await contains(target).hover();
    } else {
        await contains(target).click();
    }
}

/**
 * @param {string} itemLabel
 * @param {string} optionLabel
 */
export async function toggleMenuItemOption(itemLabel, optionLabel) {
    const { parentElement: root } = queryOne`.w_menu_item:text(${itemLabel})`;
    const target = queryOne(`.w_item_option:text(${optionLabel})`, { root });
    if (target.classList.contains("dropdown-toggle")) {
        await contains(target).hover();
    } else {
        await contains(target).click();
    }
}

/**
 * @param {string} label
 */
export function isItemSelected(label) {
    return queryOne`.w_menu_item:text(${label})`.classList.contains("selected");
}

/**
 * @param {string} itemLabel
 * @param {string} optionLabel
 */
export function isOptionSelected(itemLabel, optionLabel) {
    const { parentElement: root } = queryOne`.w_menu_item:text(${itemLabel})`;
    return queryOne(`.w_item_option:text(${optionLabel})`, { root }).classList.contains("selected");
}

export function getMenuItemTexts() {
    return queryAllTexts`.dropdown-menu .w_menu_item`;
}

export function getButtons() {
    return queryAll`.w_control_panel_breadcrumbs button`;
}

export function getVisibleButtons() {
    return queryAll`.w_control_panel_breadcrumbs button:visible, .w_control_panel_actions button:visible`;
}

//-----------------------------------------------------------------------------
// Filter menu
//-----------------------------------------------------------------------------

export async function toggleFilterMenu() {
    await ensureSearchBarMenu();
    await contains(`.w_filter_menu button.dropdown-toggle`).click();
}

export async function openAddCustomFilterDialog() {
    await ensureSearchBarMenu();
    await contains(`.w_filter_menu .w_menu_item.w_add_custom_filter`).click();
}

//-----------------------------------------------------------------------------
// Group by menu
//-----------------------------------------------------------------------------

export async function toggleGroupByMenu() {
    await ensureSearchBarMenu();
    await contains(`.w_group_by_menu .dropdown-toggle`).click();
}

/**
 * @param {string} fieldName
 */
export async function selectGroup(fieldName) {
    await ensureSearchBarMenu();
    await contains(`.w_add_custom_group_menu`).select(fieldName);
}

//-----------------------------------------------------------------------------
// Favorite menu
//-----------------------------------------------------------------------------

export async function toggleFavoriteMenu() {
    await ensureSearchBarMenu();
    await contains(`.w_favorite_menu .dropdown-toggle`).click();
}

/**
 * @param {string} text
 */
export async function editFavorite(text) {
    await ensureSearchBarMenu();
    await contains(`.w_favorite_menu .w_menu_item:text(${text}) i[data-icon="edit"]`, {
        visible: false,
    }).click();
}

export async function toggleSaveFavorite() {
    await ensureSearchBarMenu();
    await contains(`.w_favorite_menu .w_add_favorite`).click();
}

/**
 * @param {string} name
 */
export async function editFavoriteName(name) {
    await ensureSearchBarMenu();
    await contains(
        `.w_favorite_menu .w_add_favorite + .w_accordion_values input[type="text"]`
    ).edit(name, { confirm: false });
}

export async function saveFavorite() {
    await ensureSearchBarMenu();
    await contains(`.w_favorite_menu .w_save_favorite`).click();
}

export async function saveAndEditFavorite() {
    await ensureSearchBarMenu();
    await contains(`.w_favorite_menu .w_edit_favorite`).click();
}

//-----------------------------------------------------------------------------
// Search bar
//-----------------------------------------------------------------------------

export function getFacetTexts() {
    return queryAllTexts(`.w_searchview_facet`);
}

/**
 * @param {string} label
 */
export async function removeFacet(label) {
    await ensureSearchView();
    await contains(`.w_searchview_facet:text(${label}) .w_facet_remove`).click();
}

/**
 * @param {string} value
 */
export async function editSearch(value) {
    await ensureSearchView();
    await contains(`.w_searchview input`).edit(value, { confirm: false });
}

export async function validateSearch() {
    await ensureSearchView();
    await contains(`.w_searchview input`).press("Enter");
}

//-----------------------------------------------------------------------------
// Switch view
//-----------------------------------------------------------------------------

/**
 * @param {import("./mock_server/mock_server").ViewType} viewType
 */
export async function switchView(viewType) {
    if (isSmall()) {
        await contains(".w_cp_switch_buttons .dropdown-toggle").click();
        await contains(`.dropdown-item:contains(${viewType.toUpperCase()})`).click();
    } else {
        await contains(`button.w_switch_view.w_${viewType}`).click();
    }
}

//-----------------------------------------------------------------------------
// Pager
//-----------------------------------------------------------------------------

/**
 * @param {HTMLElement} root
 */
export function getPagerValue(root) {
    return queryText(".w_pager .w_pager_value", { root })
        .split(/\s*-\s*/)
        .map(Number);
}

/**
 * @param {HTMLElement} root
 */
export function getPagerLimit(root) {
    return parseInt(queryText(".w_pager .w_pager_limit", { root }), 10);
}

/**
 * @param {HTMLElement} root
 */
export async function pagerNext(root) {
    await contains(".w_pager button.w_pager_next", { root }).click();
}

/**
 * @param {HTMLElement} root
 */
export async function pagerPrevious(root) {
    await contains(".w_pager button.w_pager_previous", { root }).click();
}

/**
 * @param {string} value
 */
export async function editPager(value) {
    await contains(`.w_pager .w_pager_limit`).edit(value);
}

//-----------------------------------------------------------------------------
// Action Menu
//-----------------------------------------------------------------------------

/**
 * @param {EventTarget} el
 * @param {string} [menuFinder="Action"]
 * @returns {Promise}
 */
export async function toggleActionMenu() {
    await contains(".w_cp_action_menus .dropdown-toggle").click();
}

//-----------------------------------------------------------------------------
// Search bar menu
//-----------------------------------------------------------------------------

export async function toggleSearchBarMenu() {
    await ensureSearchView();
    await contains(`.w_searchview_dropdown_toggler`).click();
}

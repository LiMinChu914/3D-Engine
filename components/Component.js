/** [NEW — COMPONENT ARCHITECTURE] Base lifecycle contract for attachable components. */
export class Component {
    constructor() {
        this.entity = null;
        this.enabled = true;
    }

    onAttach() {}
    onDetach() {}
}

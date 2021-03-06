import * as Send from "../fb-api/send";
import { Builder } from "./builder";
import { ElementBuilder } from "./element-builder";
import { TemplateMessageBuilder } from "./template-message-builder";

/**
 * Helps to create a List Template message.
 * (see https://developers.facebook.com/docs/messenger-platform/send-api-reference/list-template)
 */
export class ListTemplateMessageBuilder extends TemplateMessageBuilder<Send.ListTemplate> {

    constructor() {

        super();

        this.template = {
            template_type: Send.TemplateType.LIST,
            elements: new Array<Send.Element>()
        };
    }

    /**
     * Sets a style for the first list item.
     *
     * @param {Send.ListTopElementStyle} topElementStyle - Send.ListTopElementStyle.COMPACT or Send.ListTopElementStyle.LARGE
     * @returns {this} - for chaining
     */
    public setTopElementStyle(topElementStyle: Send.ListTopElementStyle): this {
        this.template.top_element_style = topElementStyle;
        return this;
    }

    /**
     * Adds an Element. Number of Elements must be 2-4.
     *
     * @param {ElementBuilder} elementBuilder
     * @returns {this} - for chaining
     */
    public addElement(elementBuilder: ElementBuilder): this {

        if (this.template.elements.length === 4) {
            throw new Error("couldn't add next Element to List Tepmplate message (only 2-4 elements is allowed)");
        }

        this.template.elements.push(elementBuilder.build());
        return this;
    }

    /**
     * Sets a Button for the List Template message.
     *
     * @param {Builder<T>} buttonBuilder
     */
    public setButton<T extends Send.Button>(buttonBuilder: Builder<T>): void {
        this.template.buttons = [buttonBuilder.build()];
    }
}

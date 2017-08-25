import { MessageBuilder } from "../fb-api-helpers/message-builder";
import { logger } from "../logger";
import { Reusable } from "../store/reusable";
import { ReusableDao } from "../store/reusable-dao";
import * as ga from "./graph-api";
import * as Webview from "./webview";

/**
 * Functions and types for Send API.
 * (see https://developers.facebook.com/docs/messenger-platform/send-api-reference)
 */
export class Api extends ga.GraphApi<Request> {

    private reusableDao: ReusableDao;

    /**
     * Creates an instance of MessengerProfile.Api.
     *
     * @param {string} accessToken - a Page Access Token
     */
    constructor(protected accessToken: string) {
        super(accessToken, ga.Endpoint.MESSAGES);
        this.reusableDao = new ReusableDao();
    }

    /**
     * Sends a plain text message.
     *
     * @param {string} recipientId - recipient's ID
     * @param {string} text - a text to be send
     * @returns {Promise<void>}
     */
    public sendText(recipientId: string, text: string): Promise<void> {
        return this.send(recipientId, { text });
    }

    /**
     * Sends a message with image attachment.
     *
     * @param {string} recipientId - recipient's ID
     * @param {string} url - URL of the image file
     * @param {boolean} [reusable=false] - controls whether the attachment is to be reused
     * @returns {Promise<string>} - an attachment ID
     */
    public sendImage(recipientId: string, url: string, reusable: boolean = false): Promise<string> {
        return this.sendMediaAttachment(AttachmentType.IMAGE, recipientId, url, reusable);
    }

    /**
     * Sends a message with audio attachment.
     *
     * @param {string} recipientId - recipient's ID
     * @param {string} url - URL of the audio file
     * @param {boolean} [reusable=false] - controls whether the attachment is to be reused
     * @returns {Promise<string>} - an attachment ID
     */
    public sendAudio(recipientId: string, url: string, reusable: boolean = false): Promise<string> {
        return this.sendMediaAttachment(AttachmentType.AUDIO, recipientId, url, reusable);
    }

    /**
     * Sends a message with video attachment.
     *
     * @param {string} recipientId - recipient's ID
     * @param {string} url - URL of the video file
     * @param {boolean} [reusable=false] - controls whether the attachment is to be reused
     * @returns {Promise<string>} - an attachment ID
     */
    public sendVideo(recipientId: string, url: string, reusable: boolean = false): Promise<string> {
        return this.sendMediaAttachment(AttachmentType.VIDEO, recipientId, url, reusable);
    }

    /**
     * Sends a message with file attachment.
     *
     * @param {string} recipientId - recipient's ID
     * @param {string} url - URL of the file
     * @param {boolean} [reusable=false] - controls whether the attachment is to be reused
     * @returns {Promise<string>} - an attachment ID
     */
    public sendFile(recipientId: string, url: string, reusable: boolean = false): Promise<string> {
        return this.sendMediaAttachment(AttachmentType.FILE, recipientId, url, reusable);
    }

    /**
     * Turns typing indicator on, to let the user know you are processing his request.
     *
     * @param {string} recipientId - recipient's ID
     * @returns {Promise<void>}
     */
    public typingOn(recipientId: string): Promise<void> {
        return this.sendRequest({
            recipient: JSON.stringify({
                id: recipientId
            }),
            sender_action: SenderAction.TYPING_ON
        });
    }

    /**
     * Turns typing indicator off.
     *
     * @param {string} recipientId - recipient's ID
     * @returns {Promise<void>}
     */
    public typingOff(recipientId: string): Promise<void> {
        return this.sendRequest({
            recipient: JSON.stringify({
                id: recipientId
            }),
            sender_action: SenderAction.TYPING_OFF
        });
    }

    /**
     * Mark the last sent message as read.
     *
     * @param {string} recipientId - recipient's ID
     * @returns {Promise<void>}
     */
    public markSeen(recipientId: string): Promise<void> {
        return this.sendRequest({
            recipient: JSON.stringify({
                id: recipientId
            }),
            sender_action: SenderAction.MARK_SEEN
        });
    }

    /**
     * Sends a message.
     *
     * @param {string} recipientId - recipient's ID
     * @param {(Message | MessageBuilder<Message>)} messageOrBuilder - a message or message builder
     * @param {NotificationType} [notification=NotificationType.REGULAR]
     * @returns {Promise<any>}
     */
    public send(recipientId: string, messageOrBuilder: Message | MessageBuilder<Message>, notification: NotificationType = NotificationType.REGULAR): Promise<any> {

        return this.sendRequest({
            recipient: JSON.stringify({
                id: recipientId
            }),
            message: JSON.stringify(messageOrBuilder instanceof MessageBuilder ? messageOrBuilder.build() : messageOrBuilder),
            notification_type: notification
        });
    }

    private async sendMediaAttachment(type: AttachmentType, recipientId: string, url: string, reuse: boolean, notification?: NotificationType): Promise<string> {

        if (reuse) {

            const reusable: Reusable = this.reusableDao.get(url);

            if (reusable) {

                logger.info(`re-using attachment '{url}' (attachmentId=${reusable.id})`);

                this.send(recipientId, {
                    attachment: {
                        type,
                        payload: {
                            attachment_id: reusable.id
                        }
                    } as Attachment
                }, notification);

                return reusable.id;
            }
        }

        const response: Response = await this.send(recipientId, {
            attachment: {
                type,
                payload: {
                    url,
                    is_reusable: reuse
                }
            } as Attachment
        }, notification);

        if (reuse && response) {
            // save attachmentId to re-use later
            this.reusableDao.save({ url, id: response.attachment_id });
            return response.attachment_id;
        }

        return undefined;
    }
}

export interface Name {
    first_name: string;
    last_name: string;
}

export interface Recipient {
    id: string;
    phone_number: string;
    name: Name;
}

export enum ContentType {
    TEXT = "text",
    LOCATION = "location"
}

export interface TextQuickReply {
    content_type: ContentType.TEXT;
    title: string;
    payload: string;
    image_url?: string;
}

export interface LocationQuickReply {
    content_type: ContentType.LOCATION;
}

export type QuickReply = TextQuickReply | LocationQuickReply;

export enum TemplateType {
    GENERIC = "generic",
    BUTTON = "button",
    LIST = "list",
    OPEN_GRAPH = "open_graph",
    RECEIPT = "receipt"
}

export enum ImageAspectRatio {
    HORIZONTAL = "horizontal",
    SQUARE = "square"
}

export enum ButtonType {
    WEB_URL = "web_url",
    POSTBACK = "postback",
    CALL = "phone_number",
    SHARE = "element_share",
    LOGIN = "account_link",
    LOGOUT = "account_unlink"
}

export interface UrlButton {
    type: ButtonType.WEB_URL;
    title: string;
    url: string;
    webview_height_ratio?: Webview.HeightRatio;
    messenger_extensions?: boolean;
    fallback_url?: string;
    webview_share_button?: Webview.ShareButton;
}

export interface PostbackButton {
    type: ButtonType.POSTBACK;
    title: string;
    payload: string;
}

export interface CallButton {
    type: ButtonType.CALL;
    title: string;
    payload: string;
}

export interface ShareButton {
    type: ButtonType.SHARE;
    share_contents?: {
        attachment: GenericTemplateAttachment
    };
}

export interface LoginButton {
    type: ButtonType.LOGIN;
    url: string;
}

export interface LogoutButton {
    type: ButtonType.LOGOUT;
}

export type Button = UrlButton | PostbackButton | CallButton | ShareButton | LoginButton | LogoutButton;

export interface DefaultAction {
    type: ButtonType.WEB_URL;
    url: string;
    webview_height_ratio?: Webview.HeightRatio;
    messenger_extensions?: boolean;
    fallback_url?: string;
    webview_share_button?: Webview.ShareButton;
}

export interface Element {
    title: string;
    subtitle?: string;
    image_url?: string;
    default_action?: DefaultAction;
    buttons?: Button[];
}

export interface GenericTemplate {
    template_type: TemplateType.GENERIC;
    sherable?: boolean;
    image_aspect_ratio?: ImageAspectRatio;
    elements: Element[];
}

export interface ButtonTemplate {
    template_type: TemplateType.BUTTON;
    text: string;
    buttons: Button[];
}

export enum ListTopElementStyle {
    LARGE = "large",
    COMPACT = "compact"
}

export interface ListTemplate {
    template_type: TemplateType.LIST;
    top_element_style?: ListTopElementStyle;
    elements: Element[];
    buttons?: Button[];
}

export interface OpenGraphElement {
    url: string;
    buttons?: Button[];
}

export interface OpenGraphTemplate {
    template_type: TemplateType.OPEN_GRAPH;
    elements: OpenGraphElement[];
}

export interface ReceiptElement {
    title: string;
    subtitle?: string;
    quantity?: number;
    price: number;
    currency?: string;
    image_url?: string;
}

export interface Address {
    street_1: string;
    street_2?: string;
    city: string;
    postal_code: string;
    state: string;
    country: string;
}

export interface PaymentSummary {
    subtotal?: number;
    shipping_cost?: number;
    total_tax?: number;
    total_cost: number;
}

export interface PaymentAdjustments {
    name: string;
    amount: number;
}

export interface ReceiptTemplate {
    template_type: TemplateType.RECEIPT;
    sherable?: boolean;
    recipient_name: string;
    merchant_name?: string;
    order_number: string;
    currency: string;
    payment_method: string;
    timestamp?: string;
    order_url?: string;
    elements?: ReceiptElement[];
    address?: Address;
    summary: PaymentSummary;
    adjustments?: PaymentAdjustments;
}

export type Template = GenericTemplate | ButtonTemplate | ListTemplate | ReceiptTemplate | OpenGraphTemplate;

export enum AttachmentType {
    IMAGE = "image",
    AUDIO = "audio",
    VIDEO = "video",
    FILE = "file",
    TEMPLATE = "template"
}

export interface MediaPayload {
    url?: string;
    is_reusable?: boolean;
    attachment_id?: string;
}

export interface ImageAttachment {
    type: AttachmentType.IMAGE;
    payload: MediaPayload;
}

export interface AudioAttachment {
    type: AttachmentType.AUDIO;
    payload: MediaPayload;
}

export interface VideoAttachment {
    type: AttachmentType.VIDEO;
    payload: MediaPayload;
}

export interface FileAttachment {
    type: AttachmentType.FILE;
    payload: MediaPayload;
}

export interface TemplateAttachment {
    type: AttachmentType.TEMPLATE;
    payload: Template;
}

// for ShareButton espec.
export interface GenericTemplateAttachment {
    type: AttachmentType.TEMPLATE;
    payload: GenericTemplate;
}

export type MediaAttachment = ImageAttachment | AudioAttachment | VideoAttachment | FileAttachment;

export type Attachment = MediaAttachment | TemplateAttachment;

export interface AbstractMessage {
    quick_replies?: QuickReply[];
    metadata?: string;
}

export interface TextMessage extends AbstractMessage {
    text: string;
}

export interface AttachmentMessage extends AbstractMessage {
    attachment: Attachment;
}

export type Message = TextMessage | AttachmentMessage;

export enum SenderAction {
    TYPING_ON = "typing_on",
    TYPING_OFF = "typing_off",
    MARK_SEEN = "mark_seen"
}

export enum NotificationType {
    REGULAR = "REGULAR",
    SILENT_PUSH = "SILENT_PUSH",
    NO_PUSH = "NO_PUSH"
}

export enum Tag {
    SHIPPING_UPDATE = "SHIPPING_UPDATE",
    RESERVATION_UPDATE = "RESERVATION_UPDATE",
    ISSUE_RESOLUTION = "ISSUE_RESOLUTION"
}

export interface Request extends ga.Request {
    recipient: string;
    message?: string;
    sender_action?: SenderAction;
    notification_type?: NotificationType;
    tag?: Tag;
}

export interface Response {
    recipient_id: string;
    message_id: string;
    attachment_id?: string;
}

export interface Error {
    message: string;
    type: string;
    code: number;
    error_subcode: number;
    fbtrace_id: string;
}

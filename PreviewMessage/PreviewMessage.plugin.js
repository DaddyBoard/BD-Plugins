/**
* @name PreviewMessage
* @author DaddyBoard
* @authorId 241334335884492810
* @version 1.1.0
* @description Allows you to preview a message before you send it. Original idea by TheCommieAxolotl, rewritten and maintained by DaddyBoard.
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher } = BdApi;

const DraftStore = Webpack.getModule((m) => m.getDraft);
const MessageActions = Webpack.getModule((m) => m.sendBotMessage);
const ChatButtonsGroup = Webpack.getBySource("showAllButtons", "promotionsByType")?.A;
const ChatButton = Webpack.getBySource("CHAT_INPUT_BUTTON_NOTIFICATION")?.A;
const Tooltip = BdApi.Components.Tooltip;

function PreviewButton({ channel }) {
    return React.createElement(Tooltip, {
        text: "Preview Message"
    }, (props) =>
        React.createElement(
            "div",
            {
                ...props,
                style: { padding: "5px" },
                onClick: () => {
                    const draft = DraftStore.getDraft(channel.id, 0);
                    if (draft) MessageActions.sendBotMessage(channel.id, draft);
                }
            },
            React.createElement(ChatButton, null,
                React.createElement(
                    "svg",
                    {
                        xmlns: "http://www.w3.org/2000/svg",
                        viewBox: "0 0 36 36",
                        width: "24",
                        height: "24",
                    },
                    React.createElement("ellipse", { fill: "currentColor", cx: "8.828", cy: "18", rx: "7.953", ry: "13.281" }),
                    React.createElement("path", {
                        fill: "currentColor",
                        d: "M8.828 32.031C3.948 32.031.125 25.868.125 18S3.948 3.969 8.828 3.969 17.531 10.132 17.531 18s-3.823 14.031-8.703 14.031zm0-26.562C4.856 5.469 1.625 11.09 1.625 18s3.231 12.531 7.203 12.531S16.031 24.91 16.031 18 12.8 5.469 8.828 5.469z",
                    }),
                    React.createElement("circle", { fill: "var(--bg-overlay-3,var(--channeltextarea-background))", cx: "6.594", cy: "18", r: "4.96" }),
                    React.createElement("circle", { fill: "var(--bg-overlay-3,var(--channeltextarea-background))", cx: "6.594", cy: "18", r: "3.565" }),
                    React.createElement("circle", { fill: "currentColor", cx: "7.911", cy: "15.443", r: "1.426" }),
                    React.createElement("ellipse", { fill: "currentColor", cx: "27.234", cy: "18", rx: "7.953", ry: "13.281" }),
                    React.createElement("path", {
                        fill: "currentColor",
                        d: "M27.234 32.031c-4.88 0-8.703-6.163-8.703-14.031s3.823-14.031 8.703-14.031S35.938 10.132 35.938 18s-3.824 14.031-8.704 14.031zm0-26.562c-3.972 0-7.203 5.622-7.203 12.531 0 6.91 3.231 12.531 7.203 12.531S34.438 24.91 34.438 18 31.206 5.469 27.234 5.469z",
                    }),
                    React.createElement("circle", { fill: "var(--bg-overlay-3,var(--channeltextarea-background))", cx: "25", cy: "18", r: "4.96" }),
                    React.createElement("circle", { fill: "var(--bg-overlay-3,var(--channeltextarea-background))", cx: "25", cy: "18", r: "3.565" }),
                    React.createElement("circle", { fill: "currentColor", cx: "26.317", cy: "15.443", r: "1.426" })
                )
            )
        )
    );
}

module.exports = class PreviewMessage {
    constructor(meta) {
        this.meta = meta;
    }

    start() {
        Patcher.after("PreviewMessage", ChatButtonsGroup, "type", (_, args, res) => {
            if (args.length === 2 && !args[0].disabled && args[0].type.analyticsName === "normal" && Array.isArray(res.props.children)) {
                res.props.children.unshift(React.createElement(PreviewButton, { channel: args[0].channel }));
            }
        });
    }

    stop() {
        Patcher.unpatchAll("PreviewMessage");
    }
};

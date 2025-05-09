import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { MessageActions, React, UserStore } from "@webpack/common";

const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
const logger = new Logger("AutoDelete");

const settings = definePluginSettings({
    isEnabled: {
        type: OptionType.BOOLEAN,
        description: "Should auto delete be enabled? (disabling will cancel all queued deletions)",
        default: false,
        onChange: function () {
            if (settings.store.isEnabled) {
                return;
            }

            for (const ind in timeouts) {
                const timeoutId = timeouts[ind];
                clearTimeout(timeoutId);
            }

            timeouts.clear();
        }
    },
    deleteTimer: {
        type: OptionType.NUMBER,
        description: "Time to autodelete message after sending (in seconds)",
        default: 120,
    },
});

const AutoDeleteToggle: ChatBarButtonFactory = ({ isMainChat }) => {
    const { isEnabled } = settings.use(["isEnabled"]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable Auto Delete" : "Enable Auto Delete"}
            onClick={() => settings.store.isEnabled = !settings.store.isEnabled}
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                style={{ scale: "1.2" }}
            >
                <path fill={isEnabled && "var(--status-danger)" || "currentColor"} mask="url(#vc-autodelete-mask)" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z" />
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "AutoDelete",
    description: "Automatically delete messages after a configured time",
    authors: [Devs.user9684],
    settings,

    renderChatBarButton: AutoDeleteToggle,
    flux: {
        MESSAGE_CREATE: function (event) {
            if (event.message.author.id != UserStore.getCurrentUser().id) {
                return;
            }
            if (!settings.store.isEnabled) {
                return;
            }
            if (event.message.state) {
                return;
            }

            const messageId = event.message.id;
            const channelId = event.message.channel_id;
            const guildId = event.message.guild_id || "@me";

            if (timeouts.has(messageId)) {
                return;
            }

            const timeout = setTimeout(() => {
                if (!settings.store.isEnabled) {
                    return;
                }

                logger.info(`Deleting message https://discord.com/channels/${guildId}/${channelId}/${messageId}`);
                MessageActions.deleteMessage(channelId, messageId);

                delete timeouts[messageId];
            }, settings.store.deleteTimer * 1000);

            timeouts.set(messageId, timeout);
        },
    }
});

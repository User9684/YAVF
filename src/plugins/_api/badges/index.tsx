/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./fixDiscordBadgePadding.css";

import { _getBadges, BadgePosition, BadgeUserArgs, ProfileBadge } from "@api/Badges";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { Forms, Toasts, UserStore } from "@webpack/common";

async function loadBadges(noCache = false) {
    const init = {} as RequestInit;
    if (noCache)
        init.cache = "no-cache";
}

let intervalId: any;

export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users.",
    authors: [Devs.Megu, Devs.Ven, Devs.TheSun],
    patches: [
        {
            find: ".MODAL]:26",
            replacement: {
                match: /(?=;return 0===(\i)\.length\?)(?<=(\i)\.useMemo.+?)/,
                replace: ";$1=$2.useMemo(()=>[...$self.getBadges(arguments[0].displayProfile),...$1],[$1])"
            }
        },
        {
            find: "#{intl::PROFILE_USER_BADGES}",
            replacement: [
                {
                    match: /(alt:" ","aria-hidden":!0,src:)(.+?)(?=,)(?<=href:(\i)\.link.+?)/,
                    replace: (_, rest, originalSrc, badge) => `...${badge}.props,${rest}${badge}.image??(${originalSrc})`
                },
                {
                    match: /(?<="aria-label":(\i)\.description,.{0,200})children:/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}) :"
                },
                // conditionally override their onClick with badge.onClick if it exists
                {
                    match: /href:(\i)\.link/,
                    replace: "...($1.onClick&&{onClick:vcE=>$1.onClick(vcE,$1)}),$&"
                }
            ]
        }
    ],

    toolboxActions: {
        async "Refetch Badges"() {
            await loadBadges(true);
            Toasts.show({
                id: Toasts.genId(),
                message: "Successfully refetched badges!",
                type: Toasts.Type.SUCCESS
            });
        }
    },

    async start() {
        await loadBadges();

        clearInterval(intervalId);
        intervalId = setInterval(loadBadges, 1000 * 60 * 30); // 30 minutes
    },

    async stop() {
        clearInterval(intervalId);
    },

    getBadges(props: { userId: string; user?: User; guildId: string; }) {
        if (!props) return [];

        try {
            props.userId ??= props.user?.id!;

            return _getBadges(props);
        } catch (e) {
            new Logger("BadgeAPI#hasBadges").error(e);
            return [];
        }
    },

    renderBadgeComponent: ErrorBoundary.wrap((badge: ProfileBadge & BadgeUserArgs) => {
        const Component = badge.component!;
        return <Component {...badge} />;
    }, { noop: true }),

});

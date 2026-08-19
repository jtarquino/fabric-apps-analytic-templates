//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { AskPowerBIConnectorInput, AskProgressEvent } from "@/lib/mcp/contracts";
import {
    getFabricAIHubConnector,
    type FabricAIHubResult,
    type FabricAIHubTask,
} from "@/lib/mcp/fabric-aihub-connector";
import { parseStatusMessage } from "@/lib/mcp/progress";

const TASK_TIMEOUT_MS = 10 * 60 * 1000;

export async function askPowerBIThroughConnector(
    input: AskPowerBIConnectorInput,
    onProgress?: (event: AskProgressEvent) => void,
    signal?: AbortSignal,
): Promise<FabricAIHubResult> {
    let announcedTaskId: string | undefined;
    return getFabricAIHubConnector().askPowerBI(input, {
        signal,
        ttl: TASK_TIMEOUT_MS,
        timeout: TASK_TIMEOUT_MS,
        onProgress: (task: FabricAIHubTask) => {
            if (task.taskId !== announcedTaskId) {
                announcedTaskId = task.taskId;
                onProgress?.({ kind: "taskCreated", taskId: task.taskId });
            }
            if (task.statusMessage) {
                for (const event of parseStatusMessage(task.statusMessage)) {
                    onProgress?.(event);
                }
            }
        },
    });
}

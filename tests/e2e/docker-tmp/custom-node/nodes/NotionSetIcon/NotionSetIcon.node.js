"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionSetIcon = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const form_data_1 = __importDefault(require("form-data"));
class NotionSetIcon {
    description = {
        displayName: 'Notion Set Icon',
        name: 'notionSetIcon',
        icon: 'file:notionSetIcon.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Set custom icons for Notion pages',
        defaults: {
            name: 'Notion Set Icon',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'notionSetIconApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Page',
                        value: 'page',
                    },
                ],
                default: 'page',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['page'],
                    },
                },
                options: [
                    {
                        name: 'Set Icon',
                        value: 'setIcon',
                        description: 'Set a custom icon for a Notion page',
                        action: 'Set icon for a page',
                    },
                ],
                default: 'setIcon',
            },
            {
                displayName: 'Page ID',
                name: 'pageId',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['page'],
                        operation: ['setIcon'],
                    },
                },
                default: '',
                placeholder: '214c413b-2a68-800f-9f9a-d234e37d1380',
                description: 'The ID of the Notion page. Can be extracted from the page URL.',
            },
            {
                displayName: 'Icon Source',
                name: 'iconSource',
                type: 'options',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['page'],
                        operation: ['setIcon'],
                    },
                },
                options: [
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Use an external image URL',
                    },
                    {
                        name: 'Upload File',
                        value: 'upload',
                        description: 'Upload a local image file',
                    },
                ],
                default: 'url',
                description: 'Choose whether to use an external URL or upload a local file',
            },
            {
                displayName: 'Icon URL',
                name: 'iconUrl',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['page'],
                        operation: ['setIcon'],
                        iconSource: ['url'],
                    },
                },
                default: '',
                placeholder: 'https://example.com/icon.png',
                description: 'URL of the image to use as the page icon',
            },
            {
                displayName: 'Input Binary Field',
                name: 'binaryPropertyName',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['page'],
                        operation: ['setIcon'],
                        iconSource: ['upload'],
                    },
                },
                default: 'data',
                description: 'Name of the binary property containing the image file',
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('notionSetIconApi');
        for (let i = 0; i < items.length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i);
                const operation = this.getNodeParameter('operation', i);
                if (resource === 'page' && operation === 'setIcon') {
                    const pageId = this.getNodeParameter('pageId', i);
                    const iconSource = this.getNodeParameter('iconSource', i);
                    const cleanPageId = formatPageId(pageId);
                    if (!cleanPageId) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Invalid page ID: ${pageId}`, {
                            itemIndex: i,
                        });
                    }
                    let iconUrl;
                    if (iconSource === 'url') {
                        iconUrl = this.getNodeParameter('iconUrl', i);
                    }
                    else {
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        const fileBuffer = Buffer.from(binaryData.data, 'base64');
                        iconUrl = await uploadImageFile(this, fileBuffer, binaryData.fileName || 'icon.png', binaryData.mimeType || 'image/png', cleanPageId, credentials);
                    }
                    await setPageIcon(this, cleanPageId, iconUrl, credentials);
                    returnData.push({
                        json: {
                            success: true,
                            pageId: cleanPageId,
                            iconUrl,
                            message: 'Page icon updated successfully',
                        },
                        pairedItem: {
                            item: i,
                        },
                    });
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                        },
                        pairedItem: {
                            item: i,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.NotionSetIcon = NotionSetIcon;
function formatPageId(input) {
    const cleanedStr = input.replace(/-/g, '');
    let raw;
    if (input.includes('/')) {
        const match = cleanedStr.match(/([a-f0-9]{32})$/);
        if (!match) {
            return null;
        }
        raw = match[1];
    }
    else {
        if (!/^[a-f0-9]{32}$/.test(cleanedStr)) {
            return null;
        }
        raw = cleanedStr;
    }
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}
async function uploadImageFile(executeFunctions, fileBuffer, fileName, mimeType, pageId, credentials) {
    const uploadUrlPayload = {
        bucket: 'secure',
        name: fileName,
        contentType: mimeType,
        record: {
            table: 'block',
            id: pageId,
            spaceId: credentials.spaceId,
        },
        supportExtraHeaders: true,
        contentLength: fileBuffer.length,
    };
    const uploadUrlResponse = await executeFunctions.helpers.httpRequest({
        method: 'POST',
        url: 'https://www.notion.so/api/v3/getUploadFileUrl',
        body: uploadUrlPayload,
        json: true,
        headers: {
            'Cookie': `token_v2=${credentials.tokenV2};`,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'notion-client-version': '23.13.0.2800',
            'x-notion-active-user-header': credentials.userId,
            'Referer': 'https://www.notion.so/',
        },
    });
    const signedUploadUrl = uploadUrlResponse.signedUploadPostUrl;
    const s3Fields = uploadUrlResponse.fields || {};
    const finalAttachmentUrl = uploadUrlResponse.url;
    if (!signedUploadUrl || !finalAttachmentUrl) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Failed to get upload URL from Notion');
    }
    const formData = new form_data_1.default();
    Object.entries(s3Fields).forEach(([key, value]) => {
        formData.append(key, value);
    });
    formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: mimeType,
    });
    await executeFunctions.helpers.httpRequest({
        method: 'POST',
        url: signedUploadUrl,
        body: formData,
        headers: formData.getHeaders(),
    });
    return finalAttachmentUrl;
}
async function setPageIcon(executeFunctions, pageId, iconUrl, credentials) {
    const requestId = generateUUID();
    const transactionId = generateUUID();
    const currentTimestamp = Date.now();
    const updateIconPayload = {
        requestId,
        transactions: [
            {
                id: transactionId,
                spaceId: credentials.spaceId,
                debug: { userAction: 'N8nNodeIconUpdate' },
                operations: [
                    {
                        pointer: {
                            table: 'block',
                            id: pageId,
                            spaceId: credentials.spaceId,
                        },
                        path: ['format', 'page_icon'],
                        command: 'set',
                        args: iconUrl,
                    },
                    {
                        pointer: {
                            table: 'block',
                            id: pageId,
                            spaceId: credentials.spaceId,
                        },
                        path: [],
                        command: 'update',
                        args: {
                            last_edited_time: currentTimestamp,
                            last_edited_by_id: credentials.userId,
                            last_edited_by_table: 'notion_user',
                        },
                    },
                ],
            },
        ],
    };
    await executeFunctions.helpers.httpRequest({
        method: 'POST',
        url: 'https://www.notion.so/api/v3/saveTransactionsFanout',
        body: updateIconPayload,
        json: true,
        headers: {
            'Cookie': `token_v2=${credentials.tokenV2};`,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'notion-client-version': '23.13.0.2800',
            'x-notion-active-user-header': credentials.userId,
            'Referer': 'https://www.notion.so/',
        },
    });
}
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

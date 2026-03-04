/**
 * @typedef {Object} WebhookPayload
 * @property {string} event
 * @property {Object} data
 * @property {string} timestamp
 */

/**
 * Build a webhook payload for a new question.
 * @param {{questionId: string, text: string, userName: string, lessonId: string, moduleId: string}} data
 * @returns {WebhookPayload}
 */
export function buildQuestionPayload(data) {
  return {
    event: 'new_question',
    data: {
      questionId: data.questionId,
      text: data.text,
      userName: data.userName,
      lessonId: data.lessonId,
      moduleId: data.moduleId,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send a webhook to the configured N8N endpoint.
 * @param {string} url - Webhook URL
 * @param {Object} payload
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendWebhook(url, payload) {
  if (!url) return { success: false, error: 'URL de webhook no configurada' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `Webhook respondió con status ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al enviar webhook' };
  }
}

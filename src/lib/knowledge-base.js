/**
 * @typedef {Object} KnowledgeQuery
 * @property {string} question
 * @property {Object} context
 * @property {string} context.lessonId
 * @property {string} context.moduleId
 * @property {string} timestamp
 */

/**
 * Build a knowledge base query object.
 * @param {string} question
 * @param {string} lessonId
 * @param {string} moduleId
 * @returns {KnowledgeQuery}
 */
export function buildKnowledgeQuery(question, lessonId, moduleId) {
  return {
    question,
    context: { lessonId, moduleId },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Query the knowledge base (Notebook LM endpoint).
 * @param {string} endpoint - API endpoint URL
 * @param {string} question - Question text
 * @returns {Promise<{success: boolean, answer?: string, sources?: string[], error?: string}>}
 */
export async function queryKnowledgeBase(endpoint, question) {
  if (!endpoint) return { success: false, error: 'Endpoint no configurado' };
  if (!question) return { success: false, error: 'La pregunta es obligatoria' };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      return { success: false, error: `Knowledge base respondió con status ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      answer: data.answer || '',
      sources: data.sources || [],
    };
  } catch (err) {
    return { success: false, error: 'Error al consultar la base de conocimiento' };
  }
}

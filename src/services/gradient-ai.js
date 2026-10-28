import { env } from '../config/env.js';

const systemPrompt = `You are Shamba AI, a careful agricultural assistant. Give practical, understandable guidance; ask follow-up questions when location, crop, soil, irrigation, or growth stage matters. Separate general guidance from location-specific advice. Never invent live weather, market prices, laboratory results, regulations, or certainty from an ambiguous image. For pesticides and fertilizers, emphasize product labels, approved local uses, safety precautions, and professional advice. Never guarantee yields or profits.`;

export async function completeChat(messages) {
  if (!env.inferenceKey || !env.inferenceModel) throw new Error('DigitalOcean Inference is not configured. Set DO_INFERENCE_KEY and DO_INFERENCE_MODEL.');
  const response = await fetch(`${env.inferenceBaseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.inferenceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.inferenceModel, messages: [{ role: 'system', content: systemPrompt }, ...messages], temperature: 0.3 })
  });
  if (!response.ok) throw new Error(`DigitalOcean Inference returned HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DigitalOcean Inference returned no assistant content.');
  return content;
}

export { systemPrompt };

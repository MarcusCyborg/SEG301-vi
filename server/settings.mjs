import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';

const defaults = { mode: 'mock', baseUrl: '', modelId: 'gpt-5.6-luna', apiKey: '', defaultEffort: 'medium' };

function validateSettings(input) {
  const settings = {
    mode: input.mode ?? defaults.mode,
    baseUrl: String(input.baseUrl ?? defaults.baseUrl).trim(),
    modelId: String(input.modelId ?? defaults.modelId).trim(),
    apiKey: String(input.apiKey ?? defaults.apiKey),
    defaultEffort: input.defaultEffort ?? defaults.defaultEffort
  };
  if (!['mock', 'gateway'].includes(settings.mode)) throw new Error('mode must be "mock" or "gateway".');
  if (!['low', 'medium', 'high', 'xhigh'].includes(settings.defaultEffort)) throw new Error('defaultEffort must be low, medium, high, or xhigh.');
  if (settings.mode === 'gateway') {
    let url;
    try { url = new URL(settings.baseUrl); } catch { throw new Error('baseUrl must be a valid gateway URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      throw new Error('baseUrl may contain only an HTTP(S) host and path.');
    if (!settings.modelId) throw new Error('modelId is required in gateway mode.');
  }
  return settings;
}

export async function loadPrivate(root) {
  const dir = resolve(root, 'config');
  await mkdir(dir, { recursive: true });
  const identityFile = resolve(dir, 'identity.json');
  let identity;
  try { identity = JSON.parse(await readFile(identityFile, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Private installation identity is invalid; inspect config/identity.json.');
    identity = { installationId: randomUUID(), controlToken: randomBytes(32).toString('hex') };
    await writeFile(identityFile, JSON.stringify(identity), { mode: 0o600, flag: 'wx' }).catch(async (error) => {
      if (error.code !== 'EEXIST') throw error;
      identity = JSON.parse(await readFile(identityFile, 'utf8'));
    });
  }
  const file = resolve(dir, 'settings.json');
  let settings;
  try { settings = JSON.parse(await readFile(file, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Local settings are invalid; inspect config/settings.json.');
    settings = defaults;
    await writeFile(file, JSON.stringify(settings, null, 2), { mode: 0o600, flag: 'wx' }).catch((writeError) => {
      if (writeError.code !== 'EEXIST') throw writeError;
    });
  }
  try { settings = validateSettings(settings); }
  catch (error) { throw new Error(`Local settings are invalid in config/settings.json: ${error.message}`); }
  return { identity, settings, file };
}

export function publicSettings(settings) {
  return { mode: settings.mode, baseUrl: settings.baseUrl, modelId: settings.modelId,
    defaultEffort: settings.defaultEffort, hasKey: Boolean(settings.apiKey) };
}

export async function saveSettings(file, current, input) {
  const apiKey = input.clearKey ? '' : (input.apiKey ? String(input.apiKey) : current.apiKey);
  const next = validateSettings({ ...current, ...input, apiKey });
  await writeFile(`${file}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
  const { rename } = await import('node:fs/promises');
  await rename(`${file}.tmp`, file);
  return next;
}

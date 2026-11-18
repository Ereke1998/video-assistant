/**
 * Встроенный fetch в Node игнорирует HTTPS_PROXY, пока не задан NODE_USE_ENV_PROXY=1 (Node >= 22.21).
 * Если прокси настроен в окружении — перезапускаем текущий скрипт с этим флагом.
 */
import {spawnSync} from 'node:child_process';

if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
  const r = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env: {...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1'},
  });
  process.exit(r.status ?? 1);
}

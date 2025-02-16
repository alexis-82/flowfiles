import { getConfigPath } from './utils/paths';

// Usa il path risolto dinamicamente
const CONFIG_PATH = getConfigPath();

export const config = require(CONFIG_PATH);
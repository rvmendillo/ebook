// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Code shared with the admin app lives in /shared at the repository root.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../shared')];

module.exports = config;

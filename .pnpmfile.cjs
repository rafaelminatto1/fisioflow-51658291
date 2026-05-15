function readPackage(pkg, context) {
  const overrides = {
    expo: "55.0.23",
    "expo-asset": "55.0.17",
    "expo-file-system": "55.0.19",
    "expo-font": "55.0.7",
    "react-native": "0.83.6",
    react: "19.2.0",
    "react-dom": "19.2.0",
    "react-native-webview": "13.16.0",
    "@expo/vector-icons": "15.1.1",
    "@expo/fingerprint": "0.16.7",
  };

  // Força as versões em dependencies e devDependencies de QUALQUER pacote
  for (const [name, version] of Object.entries(overrides)) {
    if (pkg.dependencies && pkg.dependencies[name]) {
      pkg.dependencies[name] = version;
    }
    if (pkg.devDependencies && pkg.devDependencies[name]) {
      pkg.devDependencies[name] = version;
    }
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};

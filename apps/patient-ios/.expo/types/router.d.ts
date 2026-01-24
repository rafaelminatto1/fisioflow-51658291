/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/forgot-password` | `/(auth)/login` | `/(auth)/register` | `/(tabs)` | `/(tabs)/` | `/(tabs)/exercises` | `/(tabs)/profile` | `/(tabs)/progress` | `/_sitemap` | `/exercises` | `/forgot-password` | `/login` | `/profile` | `/progress` | `/register`;
      DynamicRoutes: `/exercise/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/exercise/[id]`;
    }
  }
}

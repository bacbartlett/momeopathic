import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML document for the web version.
 * Adds PWA manifest, theme-color, and Apple touch icon meta tags.
 *
 * This file is used by Expo Router to generate the HTML shell for the web build.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7BA085" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Acute Care" />

        {/* SEO */}
        <meta
          name="description"
          content="Homeopathy reference guide powered by Boericke's Materia Medica with AI-powered recommendations."
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work correctly.
          However, body scrolling is often useful for mobile web. If you want to enable it,
          remove this `ScrollViewStyleReset` and set `overflow: visible` on the root element.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an alternative to using global stylesheets */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #FFFBF7;
}
/* Pointer cursor for all interactive elements rendered by react-native-web */
[role="button"],
[data-focusable="true"],
a[href] {
  cursor: pointer !important;
}
/* Remove default browser focus outline on text inputs (react-native-web renders
   TextInput as <textarea> or <input>). The app uses its own border styling. */
textarea:focus,
input:focus {
  outline: none;
}
`;

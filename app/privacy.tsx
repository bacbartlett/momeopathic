import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { usePostHogAnalytics } from '@/context/posthog-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

const pp = `# PRIVACY POLICY

**Last Updated:** March 25, 2026

## 1. INTRODUCTION

BrandonBDev LLC ("Company," "we," "us," or "our") operates the Momeopath's Insider Circle - Acute Care application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.

**Please read this Privacy Policy carefully.** By using the App, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with this Privacy Policy, please do not use the App.

This Privacy Policy applies only to information collected through the App and does not apply to information collected offline or through any other means.

## 2. IMPORTANT NOTES

### 2.1 Not a HIPAA-Covered Entity

We are not a healthcare provider, health plan, or healthcare clearinghouse, and we are not subject to the Health Insurance Portability and Accountability Act (HIPAA). The App is a consumer application for educational purposes, not a medical service.

### 2.2 Geographic Scope

The App is intended for use only by residents of the United States. We do not knowingly collect information from individuals located outside the United States. This Privacy Policy is not designed to comply with the European Union's General Data Protection Regulation (GDPR) or other international privacy laws.

### 2.3 Children's Privacy

The App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. Users between ages 13-17 may only use the App with parental consent and supervision. If you believe we have collected information from a child under 13, please contact us immediately.

## 3. INFORMATION WE COLLECT

### 3.1 Information You Provide Directly

**Account Information:** When you create an account, we collect:
- Email address
- Password (stored in encrypted form)
- Any other information you voluntarily provide during registration

**Chat Content:** We collect and store:
- All messages you send through the chat interface
- Your queries and interactions with the App
- Symptom descriptions and remedy searches you conduct
- Your conversation history

**Communications:** If you contact us for support or other purposes, we collect:
- The content of your messages
- Any information you choose to provide

### 3.2 Information Collected Automatically

**Usage Analytics:** We automatically collect:
- Device information (device type, operating system, browser type)
- App usage patterns (features used, frequency of use, session duration)
- Technical data (IP address, crash reports, performance data)
- Date and time of access
- General location data (city/state level based on IP address, not precise GPS location)

**Cookies and Similar Technologies:** We may use cookies, web beacons, and similar tracking technologies to:
- Maintain your login session
- Remember your preferences
- Analyze App usage and performance
- Improve user experience

You can control cookie settings through your browser or device settings, but disabling cookies may limit functionality.

## 4. HOW WE USE YOUR INFORMATION

We use the information we collect for the following purposes:

### 4.1 To Provide and Maintain the App
- Create and manage your account
- Provide the chat interface and search functionality
- Store your conversation history for your reference
- Deliver customer support
- Send you service-related communications (account updates, technical notices, security alerts)

### 4.2 To Improve and Develop the App
- Analyze usage patterns and trends (using anonymized data)
- Improve our AI chatbot responses and accuracy
- Develop new features and functionality
- Conduct research and testing
- Monitor and analyze App performance

### 4.3 To Ensure Security and Prevent Fraud
- Detect, prevent, and address technical issues
- Monitor for and prevent fraudulent activity
- Enforce our Terms and Conditions
- Protect the rights, property, and safety of our users and the Company

### 4.4 To Communicate with You
- Respond to your inquiries and support requests
- Send you updates about your account or subscription
- Notify you of changes to our policies or services
- Send promotional communications (with your consent, where required)

### 4.5 For Legal and Compliance Purposes
- Comply with applicable laws and regulations
- Respond to legal processes (subpoenas, court orders)
- Exercise or defend legal claims
- Protect against legal liability

## 5. HOW WE PROCESS CHAT DATA WITH AI

### 5.1 AI Processing

Your chat messages are processed by **Anthropic's Claude** (an AI language model), accessed through **OpenRouter** (an API routing service), to provide responses based on Boericke's Materia Medica. When we send your messages to these AI service providers:

- **What is sent:** Your chat messages and relevant excerpts from Boericke's Materia Medica for context. Your email address, device information, and other account data are NOT sent to AI providers.
- **Purpose:** AI processing is used solely to generate responses to your queries based on the Materia Medica reference material
- **No permanent storage by AI providers:** Chat content sent to AI providers is not permanently stored in a way that could identify you
- **Third-party privacy policies:** You can review how these services handle data at [Anthropic Privacy Policy](https://www.anthropic.com/privacy) and [OpenRouter Privacy Policy](https://openrouter.ai/privacy)

### 5.2 Internal Analysis

We may analyze chat data internally (using our secure Convex database) to:
- Identify common symptom patterns and popular remedies (aggregated, anonymized data only)
- Improve the accuracy and relevance of chatbot responses
- Understand user needs and enhance the App
- Generate anonymized statistical reports

**We never identify individual users in any analysis or reporting.**

## 6. HOW WE STORE AND PROTECT YOUR INFORMATION

### 6.1 Data Storage

Your data is stored using Convex, a secure cloud database service that maintains:
- SOC 2 Type II compliance
- HIPAA compliance standards
- GDPR compliance standards
- Industry-standard encryption and security practices

All data is stored on servers located in the United States.

### 6.2 Security Measures

We implement reasonable administrative, technical, and physical security measures designed to protect your information, including:
- Encryption of data in transit (HTTPS/TLS)
- Encryption of sensitive data at rest
- Secure authentication mechanisms
- Regular security assessments
- Access controls and monitoring
- Secure coding practices

### 6.3 Data Retention

We retain your information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to:
- Comply with legal obligations
- Resolve disputes
- Enforce our agreements
- Maintain business records

When you delete your account, we will delete or anonymize your personal information within a reasonable timeframe, except where we are required to retain it for legal or legitimate business purposes.

## 7. HOW WE SHARE YOUR INFORMATION

### 7.1 We Do Not Sell Your Information

**We do not sell, rent, or trade your personal information to third parties for their marketing purposes.**

### 7.2 Service Providers

We may share your information with trusted third-party service providers who assist us in operating the App, including:

- **Cloud hosting services** (Convex) - to store your data securely
- **AI service providers** (Anthropic via OpenRouter) - to provide chatbot functionality (chat messages only; no email, device info, or account identifiers are shared)
- **Analytics services** - to help us understand App usage
- **Customer support tools** - to provide technical assistance

These service providers are contractually obligated to:
- Use your information only for the specific services they provide to us
- Maintain the confidentiality and security of your information
- Comply with applicable privacy and security standards

### 7.3 Business Transfers

If we are involved in a merger, acquisition, asset sale, bankruptcy, or other business transaction, your information may be transferred as part of that transaction. We will provide notice before your information becomes subject to a different privacy policy.

### 7.4 Legal Requirements

We may disclose your information if required to do so by law or in response to valid requests by public authorities, including to:
- Comply with legal processes (subpoenas, court orders, warrants)
- Enforce our Terms and Conditions
- Protect our rights, property, or safety, or that of our users or others
- Prevent or investigate potential illegal activities, fraud, or security threats
- Respond to emergency situations involving danger to persons

### 7.5 With Your Consent

We may share your information with third parties when you have given us explicit consent to do so.

### 7.6 Aggregated or Anonymized Data

We may share aggregated or anonymized information that does not identify you personally, such as:
- General usage statistics
- Popular remedy searches
- Trend analysis data

This information cannot be used to identify you individually.

## 8. YOUR PRIVACY RIGHTS AND CHOICES

### 8.1 Access and Update Your Information

You have the right to:
- Access the personal information we hold about you
- Update or correct your account information
- Request a copy of your data

You can access and update most information directly through your account settings. For additional requests, contact us using the information in Section 13.

### 8.2 Delete Your Account

You may delete your account at any time by:
- Using the account deletion feature in the App settings, or
- Contacting us directly

Upon deletion, we will remove or anonymize your personal information, except where we must retain it for legal or legitimate business reasons.

### 8.3 Marketing Communications

You have the right to opt out of promotional emails by:
- Clicking the "unsubscribe" link in any marketing email, or
- Updating your communication preferences in your account settings

Please note that even if you opt out of marketing communications, we will still send you important service-related messages (e.g., account updates, subscription notices, security alerts).

### 8.4 State-Specific Privacy Rights

Depending on your state of residence, you may have additional privacy rights:

#### California Residents (CCPA/CPRA)

If you are a California resident, you have the right to:

- **Know:** Request information about the categories and specific pieces of personal information we have collected, the sources of that information, our business purposes for collecting it, and the categories of third parties with whom we share it
- **Delete:** Request deletion of your personal information (subject to certain exceptions)
- **Opt-Out:** Opt out of the "sale" or "sharing" of your personal information (Note: We do not sell personal information)
- **Correct:** Request correction of inaccurate personal information
- **Limit:** Limit our use and disclosure of your sensitive personal information
- **Non-Discrimination:** Not be discriminated against for exercising your privacy rights

To exercise these rights, contact us using the information in Section 13. We will verify your identity before processing your request.

**California "Shine the Light" Law:** California residents may request information about our disclosure of personal information to third parties for their direct marketing purposes. As stated above, we do not share personal information with third parties for their direct marketing purposes.

#### Virginia Residents (VCDPA)

Virginia residents have similar rights to California residents, including the right to access, delete, correct, and opt out of the processing of personal information for targeted advertising purposes.

#### Colorado Residents (CPA)

Colorado residents have rights similar to those provided under California and Virginia law, including access, deletion, correction, and opt-out rights.

#### Connecticut Residents (CTDPA)

Connecticut residents have rights similar to those provided under California, Virginia, and Colorado law.

#### Other States

Residents of other states may have privacy rights under their state laws. Contact us to inquire about your specific rights.

## 9. THIRD-PARTY LINKS AND SERVICES

The App may contain links to third-party websites, products, or services (including affiliate links). This Privacy Policy does not apply to any third-party sites or services.

We are not responsible for the privacy practices of third parties. We encourage you to review the privacy policies of any third-party services before providing them with your information.

If you click an affiliate link and make a purchase, we may receive a commission, but your personal information shared with the third party is governed by their privacy policy, not ours.

## 10. DATA TRANSFERS

Your information may be transferred to and processed on servers located in the United States. By using the App, you consent to the transfer of your information to the United States.

If you are accessing the App from outside the United States, please be aware that your information will be transferred to, stored, and processed in the United States, where data protection laws may differ from those in your country.

## 11. DO NOT TRACK SIGNALS

Some web browsers have a "Do Not Track" (DNT) feature that signals to websites you visit that you do not want to have your online activity tracked. The App does not currently respond to DNT signals or similar mechanisms.

## 12. CHANGES TO THIS PRIVACY POLICY

We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:

- Posting the updated Privacy Policy on the App
- Updating the "Last Updated" date at the top of this policy
- Sending an email notification to your registered email address (for material changes)
- Providing an in-app notification

Your continued use of the App after changes become effective constitutes your acceptance of the updated Privacy Policy. We encourage you to review this Privacy Policy periodically.

## 13. CONTACT US

If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:

**BrandonBDev LLC**

Email: brandon@brandonb.dev  
Website: homeopathychat.com 

For privacy-related inquiries, please include "Privacy Request" in the subject line of your email.

## 14. DATA PROTECTION OFFICER

Given the nature and scope of our operations, we do not currently have a Data Protection Officer. All privacy inquiries should be directed to the contact information provided in Section 13.

## 15. CALIFORNIA CONSUMER PRIVACY ACT (CCPA) DISCLOSURES

### Categories of Personal Information Collected

In the past 12 months, we have collected the following categories of personal information:

- **Identifiers:** Email address, account username, IP address
- **Internet Activity:** Browsing history within the App, interaction with the App
- **Health Information:** Symptom descriptions and remedy searches (for educational purposes only, not medical treatment)

### Sources of Personal Information

We collect personal information directly from you, automatically through your use of the App, and from our service providers.

### Business Purposes for Collecting Personal Information

We collect personal information for the business purposes described in Section 4 of this Privacy Policy.

### Categories of Third Parties with Whom We Share Personal Information

We share personal information with:
- Service providers (cloud hosting, analytics)
- AI service providers (anonymized data only)
- Legal authorities (when required by law)

### Sale of Personal Information

**We do not sell personal information.** We have not sold personal information in the past 12 months and do not intend to do so in the future.

### CCPA Rights Request Metrics

Upon request, we will provide California residents with information about the number of CCPA rights requests we have received and how we responded to them.

## 16. COMMITMENT TO PRIVACY

We are committed to protecting your privacy and handling your information responsibly. We continuously review and update our privacy practices to ensure we meet the highest standards of data protection while providing you with valuable services.

Thank you for trusting us with your information.

---

**BY USING THE APP, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY AND AGREE TO ITS TERMS.**`

export default function PrivacyScreen() {
  const router = useRouter();
  const { track } = usePostHogAnalytics();

  // Track page view
  useEffect(() => {
    track('Privacy Policy Viewed');
  }, [track]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Markdown style={markdownStyles}>
            {pp}
          </Markdown>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
  },
  content: {
    padding: Spacing.md,
  },
});

// Markdown styles for privacy page
const markdownStyles = {
  body: {
    fontFamily: Fonts?.body ?? 'System',
    fontSize: Typography.base,
    lineHeight: Typography.base * Typography.relaxed,
    color: Colors.textPrimary,
    margin: 0,
    padding: 0,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  heading1: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  heading2: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  heading3: {
    fontFamily: Fonts?.heading ?? 'System',
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  strong: {
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  em: {
    fontStyle: 'italic' as const,
    color: Colors.textPrimary,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline' as const,
  },
  listItem: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  bullet_list: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  ordered_list: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  code_inline: {
    fontFamily: Fonts?.mono ?? 'monospace',
    fontSize: Typography.sm,
    backgroundColor: Colors.bgSecondary,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  fence: {
    fontFamily: Fonts?.mono ?? 'monospace',
    fontSize: Typography.sm,
    backgroundColor: Colors.bgSecondary,
    color: Colors.textPrimary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.md,
    marginLeft: 0,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    color: Colors.textSecondary,
  },
  hr: {
    backgroundColor: Colors.border,
    height: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
};

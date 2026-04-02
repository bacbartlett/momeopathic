import { Colors, Fonts, Radius, Spacing, Typography } from "@/constants/theme";
// import { usePostHogAnalytics } from "@/context/posthog-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";

const tandc = `# TERMS AND CONDITIONS

**Last Updated:** March 25, 2026

## 1. AGREEMENT TO TERMS

These Terms and Conditions ("Terms") constitute a legally binding agreement between you and BrandonBDev LLC ("Company," "we," "us," or "our") concerning your access to and use of the Momeopath's Insider Circle - Acute Care application, including any iOS, Android, or web-based versions (collectively, the "App").

By accessing or using the App, you agree that you have read, understood, and agree to be bound by these Terms. If you do not agree with these Terms, you must not access or use the App.

## 2. IMPORTANT MEDICAL DISCLAIMER

**THE APP IS FOR EDUCATIONAL AND INFORMATIONAL PURPOSES ONLY. IT IS NOT INTENDED TO PROVIDE MEDICAL ADVICE, DIAGNOSIS, TREATMENT, OR CURE FOR ANY DISEASE OR MEDICAL CONDITION.**

The Acute Care app provides access to information from Boericke's Materia Medica and related homeopathic reference materials through an interactive chat interface. This information is presented for educational purposes only and should not be construed as medical advice or used as a substitute for consultation with a qualified healthcare professional.

**YOU ACKNOWLEDGE AND AGREE THAT:**

- The App does not provide medical advice, diagnosis, or treatment
- The App is not a substitute for professional medical advice, diagnosis, or treatment
- You should always seek the advice of your physician or other qualified healthcare provider with any questions regarding a medical condition
- You should never disregard professional medical advice or delay in seeking it because of something you have read or learned through the App
- The App does not create a doctor-patient or healthcare provider-patient relationship
- In case of a medical emergency, call 911 or your local emergency number immediately

**RELIANCE ON ANY INFORMATION PROVIDED BY THE APP IS SOLELY AT YOUR OWN RISK.**

## 3. ELIGIBILITY AND AGE REQUIREMENTS

You must be at least 18 years of age to use the App. If you are between 13 and 17 years of age, you may only use the App with the permission and under the supervision of a parent or legal guardian who agrees to be bound by these Terms.

If you are a parent or legal guardian permitting a minor (ages 13-17) to use the App, you agree to:
- Supervise the minor's use of the App
- Be responsible for all activities conducted under the minor's account
- Be bound by these Terms on behalf of the minor
- Ensure the minor understands and complies with these Terms

Children under 13 years of age are not permitted to use the App under any circumstances.

## 4. GEOGRAPHIC RESTRICTIONS

The App is intended for use only by residents of the United States. We make no representations that the App or its content is appropriate or available for use in other locations. If you access the App from outside the United States, you do so at your own risk and are responsible for compliance with local laws.

## 5. ACCOUNT REGISTRATION AND SECURITY

To access certain features of the App, you must create an account. You agree to:

- Provide accurate, current, and complete information during registration
- Maintain and promptly update your account information
- Maintain the security and confidentiality of your account credentials
- Notify us immediately of any unauthorized access or security breach
- Accept responsibility for all activities that occur under your account

You may not:
- Use another person's account without permission
- Create multiple accounts for yourself
- Share your account credentials with others
- Create an account using automated means

We reserve the right to suspend or terminate accounts that violate these Terms or that we determine, in our sole discretion, present a security risk.

## 6. ACCESS AND USE

Access to the App is provided on an invitation-only basis. We reserve the right to modify, limit, or revoke access at any time and for any reason. Continued use of the App is subject to compliance with these Terms.

## 7. INTELLECTUAL PROPERTY RIGHTS

### 7.1 Our Content

The App and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, audio, and the design, selection, and arrangement thereof) are owned by BrandonBDev LLC, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.

Boericke's Materia Medica content is in the public domain, but our presentation, organization, and interactive features are proprietary.

### 7.2 Your License to Use

Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to:
- Access and use the App for your personal, non-commercial use
- Download and use any mobile applications we provide on your personal devices

You may not:
- Modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell any information or content obtained from the App
- Reverse engineer, decompile, or disassemble any aspect of the App
- Remove, alter, or obscure any proprietary notices
- Use the App for any commercial purpose without our express written permission
- Use automated systems (bots, scrapers) to access the App
- Attempt to bypass any security measures or access restrictions

## 8. USER-GENERATED CONTENT

### 8.1 Your Content

You retain ownership of any content you submit through the App, including chat messages and queries ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free, sublicensable license to use, reproduce, process, and analyze your User Content solely for the purposes of:
- Operating and improving the App
- Providing services to you
- Analyzing anonymized usage trends
- Training and improving our AI systems (using only anonymized data)

### 8.2 Your Responsibilities

You are solely responsible for your User Content. You represent and warrant that:
- You own or have the necessary rights to submit your User Content
- Your User Content does not violate any third-party rights
- Your User Content complies with these Terms

### 8.3 Prohibited Content

You may not submit User Content that:
- Is illegal, harmful, threatening, abusive, harassing, defamatory, or invasive of privacy
- Contains viruses, malware, or other harmful code
- Violates any intellectual property rights
- Contains false or misleading information
- Impersonates any person or entity

### 8.4 Our Rights

We reserve the right (but have no obligation) to:
- Monitor User Content
- Remove or refuse to post any User Content
- Terminate accounts that violate these Terms

We are not responsible for User Content and do not endorse any opinions expressed by users.

## 9. AFFILIATE LINKS

The App may contain affiliate links to third-party products or services. If you click on an affiliate link and make a purchase, we may receive a commission at no additional cost to you. We only recommend products or services we believe may be valuable to our users, but the inclusion of affiliate links does not constitute an endorsement. You should conduct your own independent research before making any purchase decisions.

## 10. THIRD-PARTY SERVICES AND LINKS

The App may contain links to third-party websites or services that are not owned or controlled by us. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services. You acknowledge and agree that we shall not be liable for any damage or loss caused by your use of any third-party content, goods, or services.

## 11. DISCLAIMERS AND LIMITATIONS OF LIABILITY

### 11.1 No Warranties

THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.

WE DO NOT WARRANT THAT:
- The App will be uninterrupted, secure, or error-free
- Any defects will be corrected
- The App is free of viruses or harmful components
- The information provided through the App is accurate, complete, or current
- The results obtained from use of the App will be reliable

### 11.2 Limitation of Liability

TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL BRANDONBDEV LLC, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR:

- ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
- ANY LOSS OF PROFITS, REVENUE, DATA, OR USE
- ANY PERSONAL INJURY OR PROPERTY DAMAGE
- ANY DAMAGES RESULTING FROM YOUR USE OR INABILITY TO USE THE APP
- ANY DAMAGES RESULTING FROM RELIANCE ON INFORMATION PROVIDED THROUGH THE APP

THIS LIMITATION APPLIES WHETHER THE ALLEGED LIABILITY IS BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER BASIS, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

IN JURISDICTIONS THAT DO NOT ALLOW THE EXCLUSION OR LIMITATION OF INCIDENTAL OR CONSEQUENTIAL DAMAGES, OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.

IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, AND CAUSES OF ACTION EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.

### 11.3 Health-Related Disclaimer

YOU SPECIFICALLY ACKNOWLEDGE AND AGREE THAT WE ARE NOT LIABLE FOR ANY HEALTH-RELATED CONSEQUENCES ARISING FROM YOUR USE OF THE APP OR RELIANCE ON INFORMATION PROVIDED THROUGH THE APP. YOU ASSUME FULL RESPONSIBILITY FOR ALL HEALTH DECISIONS AND ACKNOWLEDGE THAT THE APP IS NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL CARE.

## 12. INDEMNIFICATION

You agree to defend, indemnify, and hold harmless BrandonBDev LLC, its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from:

- Your use or misuse of the App
- Your violation of these Terms
- Your violation of any rights of another party
- Your User Content
- Any health consequences resulting from actions you take based on information from the App

## 13. MODIFICATIONS TO THE APP AND TERMS

### 13.1 Modifications to the App

We reserve the right to modify, suspend, or discontinue the App (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the App.

### 13.2 Modifications to Terms

We may revise these Terms at any time by posting updated Terms. The "Last Updated" date at the top of these Terms will be revised. Your continued use of the App after changes become effective constitutes your acceptance of the revised Terms. If you do not agree to the modified Terms, you must stop using the App.

For material changes, we will provide reasonable notice (such as via email or in-app notification) at least 30 days before the effective date.

## 14. TERMINATION

### 14.1 Termination by You

You may terminate your account at any time by contacting us or using the account cancellation feature in the App. Upon termination, your right to use the App will immediately cease.

### 14.2 Termination by Us

We may suspend or terminate your access to the App immediately, without prior notice or liability, for any reason, including but not limited to:
- Breach of these Terms
- Fraudulent or illegal activity
- Requests by law enforcement
- Prolonged periods of inactivity
- Technical or security concerns

### 14.3 Effect of Termination

Upon termination:
- Your license to use the App will immediately cease
- You must cease all use of the App
- We may delete your account and User Content (subject to our Privacy Policy)
- Provisions of these Terms that by their nature should survive will survive termination, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability

## 15. GOVERNING LAW AND DISPUTE RESOLUTION

### 15.1 Governing Law

These Terms and your use of the App shall be governed by and construed in accordance with the laws of the State of Michigan, United States, without regard to its conflict of law principles.

### 15.2 Dispute Resolution

Any dispute arising from these Terms or your use of the App shall be resolved exclusively in the state or federal courts located in Michigan. You consent to the personal jurisdiction and venue of such courts.

### 15.3 Class Action Waiver

YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.

### 15.4 Time Limitation

Any claim or cause of action arising from or related to your use of the App must be filed within one (1) year after the claim or cause of action arose; otherwise, such claim or cause of action is permanently barred.

## 16. SEVERABILITY

If any provision of these Terms is held to be invalid, illegal, or unenforceable, the validity, legality, and enforceability of the remaining provisions shall not be affected or impaired.

## 17. WAIVER

No waiver of any term or condition of these Terms shall be deemed a further or continuing waiver of such term or any other term, and our failure to assert any right or provision under these Terms shall not constitute a waiver of such right or provision.

## 18. ENTIRE AGREEMENT

These Terms, together with our Privacy Policy, constitute the entire agreement between you and BrandonBDev LLC regarding the App and supersede all prior agreements and understandings, whether written or oral.

## 19. ASSIGNMENT

You may not assign or transfer these Terms or your rights and obligations under these Terms without our prior written consent. We may assign these Terms to any affiliate or in connection with a merger, acquisition, or sale of assets.

## 20. FORCE MAJEURE

We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, network infrastructure failures, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.

## 21. ELECTRONIC COMMUNICATIONS

By using the App, you consent to receiving electronic communications from us. These communications may include notices about your account, subscription, and promotional messages. You agree that all agreements, notices, disclosures, and other communications that we provide to you electronically satisfy any legal requirement that such communications be in writing.

## 22. FEEDBACK

If you provide us with any feedback, suggestions, or ideas regarding the App ("Feedback"), you grant us a perpetual, irrevocable, worldwide, royalty-free license to use, modify, and incorporate such Feedback into our products and services without any obligation to you.

## 23. U.S. GOVERNMENT RIGHTS

If you are a U.S. government entity, the App is a "commercial item" as that term is defined at 48 C.F.R. § 2.101, and the rights granted are only those granted to all other end users pursuant to these Terms.

## 24. EXPORT CONTROL

You agree to comply with all applicable U.S. export control laws and regulations. You represent that you are not located in a country subject to U.S. government embargo or designated as a "terrorist supporting" country, and that you are not on any U.S. government list of prohibited or restricted parties.

## 25. CONTACT INFORMATION

If you have any questions about these Terms, please contact us at:

**BrandonBDev LLC**  
Email: brandon@brandonb.dev 
Website: homeopathychat.com

## 26. CALIFORNIA RESIDENTS

If you are a California resident, in accordance with Cal. Civ. Code § 1789.3, you may report complaints to the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs by contacting them in writing at 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834, or by telephone at (800) 952-5210.

---

**BY USING THE APP, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS.**`;

export default function TermsScreen() {
  const router = useRouter();
  // const { track } = usePostHogAnalytics();

  // Track page view
  useEffect(() => {
    // track("Terms Viewed");
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Markdown style={markdownStyles}>{tandc}</Markdown>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: Fonts?.heading ?? "System",
    fontSize: Typography.xl,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing["2xl"],
  },
  content: {
    padding: Spacing.md,
  },
});

// Markdown styles for terms page
const markdownStyles = {
  body: {
    fontFamily: Fonts?.body ?? "System",
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
    fontFamily: Fonts?.heading ?? "System",
    fontSize: Typography["2xl"],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  heading2: {
    fontFamily: Fonts?.heading ?? "System",
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  heading3: {
    fontFamily: Fonts?.heading ?? "System",
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
    fontStyle: "italic" as const,
    color: Colors.textPrimary,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: "underline" as const,
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
    fontFamily: Fonts?.mono ?? "monospace",
    fontSize: Typography.sm,
    backgroundColor: Colors.bgSecondary,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  fence: {
    fontFamily: Fonts?.mono ?? "monospace",
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

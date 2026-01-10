import { EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID, EXPO_PUBLIC_REVENUECAT_IOS_KEY, isDev } from '@/lib/env';
import { useUser } from '@clerk/clerk-expo';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

// Entitlement identifier - this should match what you set up in RevenueCat dashboard
// Can be configured via environment variable or defaults to 'premium'
const ENTITLEMENT_ID = EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID;

interface RevenueCatContextType {
  /** Whether RevenueCat has been initialized */
  isReady: boolean;
  /** Whether RevenueCat was successfully initialized (false if skipped in dev mode) */
  isInitialized: boolean;
  /** Whether RevenueCat failed to initialize (e.g., missing API key) */
  initializationFailed: boolean;
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** Whether we're currently loading subscription status */
  isLoading: boolean;
  /** Current customer info from RevenueCat */
  customerInfo: CustomerInfo | null;
  /** Current offerings available for purchase */
  currentOffering: PurchasesOffering | null;
  /** Purchase a package */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore purchases */
  restorePurchases: () => Promise<boolean>;
  /** Refresh customer info */
  refreshCustomerInfo: () => Promise<void>;
  /** Error message if any */
  error: string | null;
}

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

interface RevenueCatProviderProps {
  children: ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  console.log('[RevenueCat] RevenueCatProvider: Component rendering');
  
  const [isReady, setIsReady] = useState(false);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get Clerk user for identity sync
  const { user, isLoaded: isClerkLoaded } = useUser();
  console.log('[RevenueCat] Clerk state - isLoaded:', isClerkLoaded, 'userId:', user?.id ?? 'null');
  
  // Track current RevenueCat user ID to avoid unnecessary logIn calls
  const currentRevenueCatUserIdRef = useRef<string | null>(null);

  // Check if user has active subscription
  // First check for the specific entitlement ID, then fall back to checking if ANY entitlement is active
  const hasSpecificEntitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  const hasAnyEntitlement = Object.keys(customerInfo?.entitlements.active ?? {}).length > 0;
  const isSubscribed = hasSpecificEntitlement || hasAnyEntitlement;
  
  // Comprehensive logging for subscription status
  console.log('[RevenueCat] Subscription Status Check:', {
    hasCustomerInfo: !!customerInfo,
    entitlementId: ENTITLEMENT_ID,
    hasSpecificEntitlement,
    hasAnyEntitlement,
    activeEntitlementKeys: customerInfo ? Object.keys(customerInfo.entitlements.active) : [],
    allEntitlementKeys: customerInfo ? Object.keys(customerInfo.entitlements.all) : [],
    isSubscribed,
  });
  
  if (customerInfo) {
    console.log('[RevenueCat] Full Customer Info:', {
      activeEntitlements: customerInfo.entitlements.active,
      allEntitlements: customerInfo.entitlements.all,
      firstSeen: customerInfo.firstSeen,
      originalAppUserId: customerInfo.originalAppUserId,
      requestDate: customerInfo.requestDate,
      managementURL: customerInfo.managementURL,
    });
  }

  // Initialize RevenueCat
  useEffect(() => {
    console.log('[RevenueCat] Initialization useEffect triggered');
    
    const initRevenueCat = async () => {
      console.log('[RevenueCat] ========== INITIALIZATION START ==========');
      console.log('[RevenueCat] Platform:', Platform.OS);
      console.log('[RevenueCat] isDev:', isDev);
      console.log('[RevenueCat] ENTITLEMENT_ID:', ENTITLEMENT_ID);
      
      try {
        // Get platform-specific API key
        const apiKey = Platform.select({
          ios: EXPO_PUBLIC_REVENUECAT_IOS_KEY,
          android: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        });
        
        console.log('[RevenueCat] API Key retrieved:', {
          platform: Platform.OS,
          hasApiKey: !!apiKey,
          apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'null',
          iosKey: EXPO_PUBLIC_REVENUECAT_IOS_KEY ? EXPO_PUBLIC_REVENUECAT_IOS_KEY.substring(0, 10) + '...' : 'null',
          androidKey: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ? EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.substring(0, 10) + '...' : 'null',
        });

        // If in dev mode and no API key, skip initialization gracefully
        if (isDev && !apiKey) {
          console.log('[RevenueCat] ⚠️ Skipping initialization in dev mode (no API key provided)');
          console.log('[RevenueCat] Setting state: isReady=true, isLoading=false, initializationFailed=false, isInitialized=false');
          setIsReady(true);
          setIsLoading(false);
          setInitializationFailed(false);
          setIsInitialized(false);
          console.log('[RevenueCat] ========== INITIALIZATION SKIPPED ==========');
          return;
        }

        if (!apiKey) {
          const errorMsg = 'RevenueCat API key not found for this platform';
          console.error('[RevenueCat] ❌ ERROR:', errorMsg);
          throw new Error(errorMsg);
        }

        // Set log level for debugging (remove in production)
        console.log('[RevenueCat] Setting log level to VERBOSE');
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }

        // Configure RevenueCat
        console.log('[RevenueCat] Calling Purchases.configure()...');
        const configureStartTime = Date.now();
        await Purchases.configure({ apiKey });
        const configureDuration = Date.now() - configureStartTime;
        console.log('[RevenueCat] ✅ Purchases.configure() completed in', configureDuration, 'ms');
        console.log('[RevenueCat] Setting isInitialized=true');
        setIsInitialized(true);

        // Get initial customer info
        console.log('[RevenueCat] Calling Purchases.getCustomerInfo()...');
        const customerInfoStartTime = Date.now();
        const info = await Purchases.getCustomerInfo();
        const customerInfoDuration = Date.now() - customerInfoStartTime;
        console.log('[RevenueCat] ✅ Purchases.getCustomerInfo() completed in', customerInfoDuration, 'ms');
        console.log('[RevenueCat] Customer Info received:', {
          originalAppUserId: info.originalAppUserId,
          firstSeen: info.firstSeen,
          requestDate: info.requestDate,
          activeEntitlements: Object.keys(info.entitlements.active),
          allEntitlements: Object.keys(info.entitlements.all),
          managementURL: info.managementURL,
        });
        setCustomerInfo(info);
        console.log('[RevenueCat] Customer info state updated');

        // Get offerings
        console.log('[RevenueCat] Calling Purchases.getOfferings()...');
        const offeringsStartTime = Date.now();
        const offerings = await Purchases.getOfferings();
        const offeringsDuration = Date.now() - offeringsStartTime;
        console.log('[RevenueCat] ✅ Purchases.getOfferings() completed in', offeringsDuration, 'ms');
        console.log('[RevenueCat] Offerings received:', {
          hasCurrent: !!offerings.current,
          currentIdentifier: offerings.current?.identifier,
          availablePackages: offerings.current?.availablePackages.map(p => ({
            identifier: p.identifier,
            productId: p.product.identifier,
            price: p.product.priceString,
          })),
          allOfferings: Object.keys(offerings.all),
        });
        
        if (offerings.current) {
          setCurrentOffering(offerings.current);
          console.log('[RevenueCat] Current offering state updated');
        } else {
          console.log('[RevenueCat] ⚠️ No current offering available');
        }

        console.log('[RevenueCat] Setting isReady=true, error=null');
        setIsReady(true);
        setError(null);
        console.log('[RevenueCat] ========== INITIALIZATION SUCCESS ==========');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize RevenueCat';
        const errorDetails = err instanceof Error ? {
          message: err.message,
          name: err.name,
          stack: err.stack,
        } : { error: String(err) };
        
        console.error('[RevenueCat] ========== INITIALIZATION ERROR ==========');
        console.error('[RevenueCat] Error message:', errorMessage);
        console.error('[RevenueCat] Error details:', errorDetails);
        console.error('[RevenueCat] Setting state: error=', errorMessage, 'initializationFailed=true, isInitialized=false, isReady=true');
        
        setError(errorMessage);
        setInitializationFailed(true);
        setIsInitialized(false);
        // Mark as "ready" even on failure so the app doesn't hang on a grey screen
        setIsReady(true);
        console.error('[RevenueCat] ========== INITIALIZATION FAILED ==========');
      } finally {
        console.log('[RevenueCat] Setting isLoading=false');
        setIsLoading(false);
        console.log('[RevenueCat] Final state:', {
          isReady,
          isInitialized,
          initializationFailed,
          isLoading: false,
          hasError: !!error,
        });
      }
    };

    initRevenueCat();

    // Listen for customer info updates (may be undefined on unsupported platforms like web)
    let listenerCleanup: (() => void) | undefined;
    
    console.log('[RevenueCat] Setting up customer info update listener...');
    if (typeof Purchases.addCustomerInfoUpdateListener === 'function') {
      console.log('[RevenueCat] ✅ addCustomerInfoUpdateListener is available');
      // The listener returns an EmitterSubscription with a remove() method
      const subscription = Purchases.addCustomerInfoUpdateListener((info) => {
        console.log('[RevenueCat] ========== CUSTOMER INFO UPDATE LISTENER TRIGGERED ==========');
        console.log('[RevenueCat] Updated Customer Info:', {
          originalAppUserId: info.originalAppUserId,
          firstSeen: info.firstSeen,
          requestDate: info.requestDate,
          activeEntitlements: Object.keys(info.entitlements.active),
          allEntitlements: Object.keys(info.entitlements.all),
          managementURL: info.managementURL,
        });
        console.log('[RevenueCat] Full entitlements.active:', info.entitlements.active);
        console.log('[RevenueCat] Full entitlements.all:', info.entitlements.all);
        console.log('[RevenueCat] Updating customerInfo state...');
        setCustomerInfo(info);
        console.log('[RevenueCat] ========== CUSTOMER INFO UPDATE COMPLETE ==========');
      }) as { remove: () => void } | undefined;
      
      if (subscription?.remove) {
        listenerCleanup = () => {
          console.log('[RevenueCat] Cleaning up customer info update listener');
          subscription.remove();
        };
        console.log('[RevenueCat] ✅ Customer info update listener registered');
      } else {
        console.log('[RevenueCat] ⚠️ Subscription does not have remove method');
      }
    } else {
      console.log('[RevenueCat] ⚠️ addCustomerInfoUpdateListener is not available on this platform');
    }

    return () => {
      console.log('[RevenueCat] Cleanup: Removing customer info update listener');
      listenerCleanup?.();
    };
  }, []);

  // Sync RevenueCat user identity with Clerk user ID
  useEffect(() => {
    console.log('[RevenueCat] ========== USER IDENTITY SYNC EFFECT ==========');
    console.log('[RevenueCat] Dependencies:', {
      isReady,
      isClerkLoaded,
      clerkUserId: user?.id ?? 'null',
      isInitialized,
      currentRevenueCatUserId: currentRevenueCatUserIdRef.current,
    });
    
    // Wait for both RevenueCat and Clerk to be ready
    // Skip if RevenueCat wasn't initialized (e.g., dev mode without API key)
    if (!isReady || !isClerkLoaded || !isInitialized) {
      console.log('[RevenueCat] ⏸️ Skipping sync - dependencies not ready');
      return;
    }

    const syncUserIdentity = async () => {
      console.log('[RevenueCat] ========== SYNC USER IDENTITY START ==========');
      try {
        const clerkUserId = user?.id ?? null;
        const currentRevenueCatUserId = currentRevenueCatUserIdRef.current;
        
        console.log('[RevenueCat] Sync state:', {
          clerkUserId,
          currentRevenueCatUserId,
          needsLogin: clerkUserId && clerkUserId !== currentRevenueCatUserId,
          needsLogout: !clerkUserId && currentRevenueCatUserId !== null,
        });

        // User signed in: log in to RevenueCat with Clerk user ID
        if (clerkUserId && clerkUserId !== currentRevenueCatUserId) {
          console.log('[RevenueCat] 🔐 Logging in user to RevenueCat');
          console.log('[RevenueCat] Clerk User ID:', clerkUserId);
          console.log('[RevenueCat] Previous RevenueCat User ID:', currentRevenueCatUserId);
          console.log('[RevenueCat] Setting isLoading=true');
          setIsLoading(true);
          
          console.log('[RevenueCat] Calling Purchases.logIn()...');
          const loginStartTime = Date.now();
          const { customerInfo: newInfo } = await Purchases.logIn(clerkUserId);
          const loginDuration = Date.now() - loginStartTime;
          console.log('[RevenueCat] ✅ Purchases.logIn() completed in', loginDuration, 'ms');
          console.log('[RevenueCat] Login response:', {
            originalAppUserId: newInfo.originalAppUserId,
            activeEntitlements: Object.keys(newInfo.entitlements.active),
            allEntitlements: Object.keys(newInfo.entitlements.all),
          });
          
          console.log('[RevenueCat] Updating currentRevenueCatUserIdRef to:', clerkUserId);
          currentRevenueCatUserIdRef.current = clerkUserId;
          console.log('[RevenueCat] Updating customerInfo state');
          setCustomerInfo(newInfo);
          
          // Refresh offerings after login
          console.log('[RevenueCat] Refreshing offerings after login...');
          const offeringsStartTime = Date.now();
          const offerings = await Purchases.getOfferings();
          const offeringsDuration = Date.now() - offeringsStartTime;
          console.log('[RevenueCat] ✅ Offerings refreshed in', offeringsDuration, 'ms');
          console.log('[RevenueCat] Offerings:', {
            hasCurrent: !!offerings.current,
            currentIdentifier: offerings.current?.identifier,
            availablePackages: offerings.current?.availablePackages.map(p => ({
              identifier: p.identifier,
              productId: p.product.identifier,
            })),
          });
          
          if (offerings.current) {
            setCurrentOffering(offerings.current);
            console.log('[RevenueCat] Current offering state updated');
          }
          
          console.log('[RevenueCat] Setting isLoading=false, error=null');
          setIsLoading(false);
          setError(null);
          console.log('[RevenueCat] ========== LOGIN SUCCESS ==========');
        }
        // User signed out: log out from RevenueCat
        else if (!clerkUserId && currentRevenueCatUserId !== null) {
          console.log('[RevenueCat] 🚪 Logging out user from RevenueCat');
          console.log('[RevenueCat] Previous RevenueCat User ID:', currentRevenueCatUserId);
          console.log('[RevenueCat] Setting isLoading=true');
          setIsLoading(true);
          
          console.log('[RevenueCat] Calling Purchases.logOut()...');
          const logoutStartTime = Date.now();
          const newInfo = await Purchases.logOut();
          const logoutDuration = Date.now() - logoutStartTime;
          console.log('[RevenueCat] ✅ Purchases.logOut() completed in', logoutDuration, 'ms');
          console.log('[RevenueCat] Logout response:', {
            originalAppUserId: newInfo.originalAppUserId,
            activeEntitlements: Object.keys(newInfo.entitlements.active),
          });
          
          console.log('[RevenueCat] Clearing currentRevenueCatUserIdRef');
          currentRevenueCatUserIdRef.current = null;
          console.log('[RevenueCat] Updating customerInfo state');
          setCustomerInfo(newInfo);
          
          console.log('[RevenueCat] Setting isLoading=false, error=null');
          setIsLoading(false);
          setError(null);
          console.log('[RevenueCat] ========== LOGOUT SUCCESS ==========');
        } else {
          console.log('[RevenueCat] ℹ️ No sync needed - user state unchanged');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync user identity';
        const errorDetails = err instanceof Error ? {
          message: err.message,
          name: err.name,
          stack: err.stack,
        } : { error: String(err) };
        
        console.error('[RevenueCat] ========== SYNC ERROR ==========');
        console.error('[RevenueCat] Error message:', errorMessage);
        console.error('[RevenueCat] Error details:', errorDetails);
        console.error('[RevenueCat] Setting error state and isLoading=false');
        setError(errorMessage);
        setIsLoading(false);
        console.error('[RevenueCat] ========== SYNC FAILED ==========');
      }
    };

    syncUserIdentity();
  }, [isReady, isClerkLoaded, user?.id, isInitialized]);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    console.log('[RevenueCat] ========== PURCHASE PACKAGE CALLED ==========');
    console.log('[RevenueCat] Package details:', {
      identifier: pkg.identifier,
      productId: pkg.product.identifier,
      productTitle: pkg.product.title,
      productDescription: pkg.product.description,
      price: pkg.product.priceString,
      priceAmount: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
      subscriptionPeriod: pkg.product.subscriptionPeriod,
      introPrice: pkg.product.introPrice,
    });
    
    if (!isInitialized) {
      console.log('[RevenueCat] ❌ Purchase skipped - RevenueCat not initialized');
      return false;
    }
    
    try {
      console.log('[RevenueCat] Setting isLoading=true, error=null');
      setIsLoading(true);
      setError(null);
      
      console.log('[RevenueCat] Calling Purchases.purchasePackage()...');
      const purchaseStartTime = Date.now();
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      const purchaseDuration = Date.now() - purchaseStartTime;
      console.log('[RevenueCat] ✅ Purchases.purchasePackage() completed in', purchaseDuration, 'ms');
      
      console.log('[RevenueCat] Purchase response - Customer Info:', {
        originalAppUserId: newInfo.originalAppUserId,
        firstSeen: newInfo.firstSeen,
        requestDate: newInfo.requestDate,
        activeEntitlements: Object.keys(newInfo.entitlements.active),
        allEntitlements: Object.keys(newInfo.entitlements.all),
        managementURL: newInfo.managementURL,
      });
      
      console.log('[RevenueCat] Full entitlements.active:', newInfo.entitlements.active);
      console.log('[RevenueCat] Full entitlements.all:', newInfo.entitlements.all);
      
      console.log('[RevenueCat] Updating customerInfo state');
      setCustomerInfo(newInfo);
      
      // Check if purchase was successful - check specific entitlement or any entitlement
      const hasSpecificEntitlement = newInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
      const hasAnyEntitlement = Object.keys(newInfo.entitlements.active).length > 0;
      const hasEntitlement = hasSpecificEntitlement || hasAnyEntitlement;
      
      console.log('[RevenueCat] Purchase validation:', {
        entitlementId: ENTITLEMENT_ID,
        hasSpecificEntitlement,
        hasAnyEntitlement,
        hasEntitlement,
        purchaseSuccessful: hasEntitlement,
      });
      
      console.log('[RevenueCat] ========== PURCHASE SUCCESS ==========');
      return hasEntitlement;
    } catch (err) {
      const errorDetails = err instanceof Error ? {
        message: err.message,
        name: err.name,
        stack: err.stack,
        userCancelled: 'userCancelled' in err ? (err as { userCancelled?: boolean }).userCancelled : undefined,
      } : { error: String(err) };
      
      console.error('[RevenueCat] ========== PURCHASE ERROR ==========');
      console.error('[RevenueCat] Error details:', errorDetails);
      
      // Check if user cancelled
      if (err instanceof Error && 'userCancelled' in err && (err as { userCancelled?: boolean }).userCancelled) {
        console.log('[RevenueCat] ℹ️ User cancelled purchase (not an error)');
        console.log('[RevenueCat] ========== PURCHASE CANCELLED ==========');
        return false;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      console.error('[RevenueCat] Setting error state:', errorMessage);
      setError(errorMessage);
      console.error('[RevenueCat] ========== PURCHASE FAILED ==========');
      return false;
    } finally {
      console.log('[RevenueCat] Setting isLoading=false');
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    console.log('[RevenueCat] ========== RESTORE PURCHASES CALLED ==========');
    
    if (!isInitialized) {
      console.log('[RevenueCat] ❌ Restore skipped - RevenueCat not initialized');
      return false;
    }
    
    try {
      console.log('[RevenueCat] Setting isLoading=true, error=null');
      setIsLoading(true);
      setError(null);
      
      console.log('[RevenueCat] Calling Purchases.restorePurchases()...');
      const restoreStartTime = Date.now();
      const info = await Purchases.restorePurchases();
      const restoreDuration = Date.now() - restoreStartTime;
      console.log('[RevenueCat] ✅ Purchases.restorePurchases() completed in', restoreDuration, 'ms');
      
      console.log('[RevenueCat] Restore response - Customer Info:', {
        originalAppUserId: info.originalAppUserId,
        firstSeen: info.firstSeen,
        requestDate: info.requestDate,
        activeEntitlements: Object.keys(info.entitlements.active),
        allEntitlements: Object.keys(info.entitlements.all),
        managementURL: info.managementURL,
      });
      
      console.log('[RevenueCat] Full entitlements.active:', info.entitlements.active);
      console.log('[RevenueCat] Full entitlements.all:', info.entitlements.all);
      
      console.log('[RevenueCat] Updating customerInfo state');
      setCustomerInfo(info);
      
      // Check if restore found entitlements - check specific or any
      const hasSpecificEntitlement = info.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
      const hasAnyEntitlement = Object.keys(info.entitlements.active).length > 0;
      const hasEntitlement = hasSpecificEntitlement || hasAnyEntitlement;
      
      console.log('[RevenueCat] Restore validation:', {
        entitlementId: ENTITLEMENT_ID,
        hasSpecificEntitlement,
        hasAnyEntitlement,
        hasEntitlement,
        restoreFoundSubscription: hasEntitlement,
      });
      
      console.log('[RevenueCat] ========== RESTORE COMPLETE ==========');
      return hasEntitlement;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      const errorDetails = err instanceof Error ? {
        message: err.message,
        name: err.name,
        stack: err.stack,
      } : { error: String(err) };
      
      console.error('[RevenueCat] ========== RESTORE ERROR ==========');
      console.error('[RevenueCat] Error message:', errorMessage);
      console.error('[RevenueCat] Error details:', errorDetails);
      console.error('[RevenueCat] Setting error state');
      setError(errorMessage);
      console.error('[RevenueCat] ========== RESTORE FAILED ==========');
      return false;
    } finally {
      console.log('[RevenueCat] Setting isLoading=false');
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Refresh customer info
  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    console.log('[RevenueCat] ========== REFRESH CUSTOMER INFO CALLED ==========');
    
    if (!isInitialized) {
      console.log('[RevenueCat] ❌ Refresh skipped - RevenueCat not initialized');
      return;
    }
    
    try {
      console.log('[RevenueCat] Calling Purchases.getCustomerInfo()...');
      const refreshStartTime = Date.now();
      const info = await Purchases.getCustomerInfo();
      const refreshDuration = Date.now() - refreshStartTime;
      console.log('[RevenueCat] ✅ Purchases.getCustomerInfo() completed in', refreshDuration, 'ms');
      
      console.log('[RevenueCat] Refresh response - Customer Info:', {
        originalAppUserId: info.originalAppUserId,
        firstSeen: info.firstSeen,
        requestDate: info.requestDate,
        activeEntitlements: Object.keys(info.entitlements.active),
        allEntitlements: Object.keys(info.entitlements.all),
        managementURL: info.managementURL,
      });
      
      console.log('[RevenueCat] Full entitlements.active:', info.entitlements.active);
      console.log('[RevenueCat] Full entitlements.all:', info.entitlements.all);
      
      console.log('[RevenueCat] Updating customerInfo state, clearing error');
      setCustomerInfo(info);
      setError(null);
      console.log('[RevenueCat] ========== REFRESH SUCCESS ==========');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh subscription status';
      const errorDetails = err instanceof Error ? {
        message: err.message,
        name: err.name,
        stack: err.stack,
      } : { error: String(err) };
      
      console.error('[RevenueCat] ========== REFRESH ERROR ==========');
      console.error('[RevenueCat] Error message:', errorMessage);
      console.error('[RevenueCat] Error details:', errorDetails);
      console.error('[RevenueCat] Setting error state');
      setError(errorMessage);
      console.error('[RevenueCat] ========== REFRESH FAILED ==========');
    }
  }, [isInitialized]);

  // Log state changes
  useEffect(() => {
    console.log('[RevenueCat] State changed:', {
      isReady,
      isInitialized,
      initializationFailed,
      isLoading,
      isSubscribed,
      hasCustomerInfo: !!customerInfo,
      hasCurrentOffering: !!currentOffering,
      error,
    });
  }, [isReady, isInitialized, initializationFailed, isLoading, isSubscribed, customerInfo, currentOffering, error]);

  console.log('[RevenueCat] Rendering RevenueCatProvider with context value');
  
  return (
    <RevenueCatContext.Provider
      value={{
        isReady,
        isInitialized,
        initializationFailed,
        isSubscribed,
        isLoading,
        customerInfo,
        currentOffering,
        purchasePackage,
        restorePurchases,
        refreshCustomerInfo,
        error,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  console.log('[RevenueCat] useRevenueCat hook called');
  const context = useContext(RevenueCatContext);
  if (!context) {
    console.error('[RevenueCat] ❌ useRevenueCat called outside RevenueCatProvider');
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  console.log('[RevenueCat] useRevenueCat returning context:', {
    isReady: context.isReady,
    isInitialized: context.isInitialized,
    isSubscribed: context.isSubscribed,
    isLoading: context.isLoading,
  });
  return context;
}

// Convenience hook for checking subscription status
export function useSubscription() {
  console.log('[RevenueCat] useSubscription hook called');
  const { isSubscribed, isLoading, isReady, initializationFailed, error } = useRevenueCat();
  const result = { 
    isSubscribed, 
    isLoading: isLoading || !isReady,
    initializationFailed,
    error,
  };
  console.log('[RevenueCat] useSubscription returning:', result);
  return result;
}

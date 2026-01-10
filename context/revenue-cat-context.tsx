import { EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID, EXPO_PUBLIC_REVENUECAT_IOS_KEY, isDev } from '@/lib/env';
import { logRevenueCat } from '@/lib/revenuecat-log-storage';
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
  logRevenueCat('log', 'RevenueCatProvider: Component rendering');
  
  const [isReady, setIsReady] = useState(false);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get Clerk user for identity sync
  const { user, isLoaded: isClerkLoaded } = useUser();
  logRevenueCat('log', 'Clerk state - isLoaded:', isClerkLoaded, 'userId:', user?.id ?? 'null');
  
  // Track current RevenueCat user ID to avoid unnecessary logIn calls
  const currentRevenueCatUserIdRef = useRef<string | null>(null);

  // Check if user has active subscription
  // First check for the specific entitlement ID, then fall back to checking if ANY entitlement is active
  const hasSpecificEntitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  const hasAnyEntitlement = Object.keys(customerInfo?.entitlements.active ?? {}).length > 0;
  const isSubscribed = hasSpecificEntitlement || hasAnyEntitlement;
  
  // Comprehensive logging for subscription status
  logRevenueCat('log', 'Subscription Status Check:', {
    hasCustomerInfo: !!customerInfo,
    entitlementId: ENTITLEMENT_ID,
    hasSpecificEntitlement,
    hasAnyEntitlement,
    activeEntitlementKeys: customerInfo ? Object.keys(customerInfo.entitlements.active) : [],
    allEntitlementKeys: customerInfo ? Object.keys(customerInfo.entitlements.all) : [],
    isSubscribed,
  });
  
  if (customerInfo) {
    logRevenueCat('log', 'Full Customer Info:', {
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
    logRevenueCat('log', 'Initialization useEffect triggered');
    
    const initRevenueCat = async () => {
      logRevenueCat('log', '========== INITIALIZATION START ==========');
      logRevenueCat('log', 'Platform:', Platform.OS);
      logRevenueCat('log', 'isDev:', isDev);
      logRevenueCat('log', 'ENTITLEMENT_ID:', ENTITLEMENT_ID);
      
      try {
        // Get platform-specific API key
        const apiKey = Platform.select({
          ios: EXPO_PUBLIC_REVENUECAT_IOS_KEY,
          android: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        });
        
        logRevenueCat('log', 'API Key retrieved:', {
          platform: Platform.OS,
          hasApiKey: !!apiKey,
          apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'null',
          iosKey: EXPO_PUBLIC_REVENUECAT_IOS_KEY ? EXPO_PUBLIC_REVENUECAT_IOS_KEY.substring(0, 10) + '...' : 'null',
          androidKey: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ? EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.substring(0, 10) + '...' : 'null',
        });

        // If in dev mode and no API key, skip initialization gracefully
        if (isDev && !apiKey) {
          logRevenueCat('log', '⚠️ Skipping initialization in dev mode (no API key provided)');
          logRevenueCat('log', 'Setting state: isReady=true, isLoading=false, initializationFailed=false, isInitialized=false');
          setIsReady(true);
          setIsLoading(false);
          setInitializationFailed(false);
          setIsInitialized(false);
          logRevenueCat('log', '========== INITIALIZATION SKIPPED ==========');
          return;
        }

        if (!apiKey) {
          const errorMsg = 'RevenueCat API key not found for this platform';
          console.error('[RevenueCat] ❌ ERROR:', errorMsg);
          throw new Error(errorMsg);
        }

        // Set log level for debugging (remove in production)
        logRevenueCat('log', 'Setting log level to VERBOSE');
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }

        // Configure RevenueCat
        logRevenueCat('log', 'Calling Purchases.configure()...');
        const configureStartTime = Date.now();
        await Purchases.configure({ apiKey });
        const configureDuration = Date.now() - configureStartTime;
        logRevenueCat('log', '✅ Purchases.configure() completed in', configureDuration, 'ms');
        logRevenueCat('log', 'Setting isInitialized=true');
        setIsInitialized(true);

        // Get initial customer info
        logRevenueCat('log', 'Calling Purchases.getCustomerInfo()...');
        const customerInfoStartTime = Date.now();
        const info = await Purchases.getCustomerInfo();
        const customerInfoDuration = Date.now() - customerInfoStartTime;
        logRevenueCat('log', '✅ Purchases.getCustomerInfo() completed in', customerInfoDuration, 'ms');
        logRevenueCat('log', 'Customer Info received:', {
          originalAppUserId: info.originalAppUserId,
          firstSeen: info.firstSeen,
          requestDate: info.requestDate,
          activeEntitlements: Object.keys(info.entitlements.active),
          allEntitlements: Object.keys(info.entitlements.all),
          managementURL: info.managementURL,
        });
        setCustomerInfo(info);
        logRevenueCat('log', 'Customer info state updated');

        // Get offerings
        logRevenueCat('log', 'Calling Purchases.getOfferings()...');
        const offeringsStartTime = Date.now();
        const offerings = await Purchases.getOfferings();
        const offeringsDuration = Date.now() - offeringsStartTime;
        logRevenueCat('log', '✅ Purchases.getOfferings() completed in', offeringsDuration, 'ms');
        logRevenueCat('log', 'Offerings received:', {
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
          logRevenueCat('log', 'Current offering state updated');
        } else {
          logRevenueCat('log', '⚠️ No current offering available');
        }

        logRevenueCat('log', 'Setting isReady=true, error=null');
        setIsReady(true);
        setError(null);
        logRevenueCat('log', '========== INITIALIZATION SUCCESS ==========');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize RevenueCat';
        const errorDetails = err instanceof Error ? {
          message: err.message,
          name: err.name,
          stack: err.stack,
        } : { error: String(err) };
        
        logRevenueCat('error', '========== INITIALIZATION ERROR ==========');
        console.error('[RevenueCat] Error message:', errorMessage);
        console.error('[RevenueCat] Error details:', errorDetails);
        logRevenueCat('error', 'Setting state: error=', errorMessage, 'initializationFailed=true, isInitialized=false, isReady=true');
        
        setError(errorMessage);
        setInitializationFailed(true);
        setIsInitialized(false);
        // Mark as "ready" even on failure so the app doesn't hang on a grey screen
        setIsReady(true);
        logRevenueCat('error', '========== INITIALIZATION FAILED ==========');
      } finally {
        logRevenueCat('log', 'Setting isLoading=false');
        setIsLoading(false);
        logRevenueCat('log', 'Final state:', {
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
    
    logRevenueCat('log', 'Setting up customer info update listener...');
    if (typeof Purchases.addCustomerInfoUpdateListener === 'function') {
      logRevenueCat('log', '✅ addCustomerInfoUpdateListener is available');
      // The listener returns an EmitterSubscription with a remove() method
      const subscription = Purchases.addCustomerInfoUpdateListener((info) => {
        logRevenueCat('log', '========== CUSTOMER INFO UPDATE LISTENER TRIGGERED ==========');
        logRevenueCat('log', 'Updated Customer Info:', {
          originalAppUserId: info.originalAppUserId,
          firstSeen: info.firstSeen,
          requestDate: info.requestDate,
          activeEntitlements: Object.keys(info.entitlements.active),
          allEntitlements: Object.keys(info.entitlements.all),
          managementURL: info.managementURL,
        });
        logRevenueCat('log', 'Full entitlements.active:', info.entitlements.active);
        logRevenueCat('log', 'Full entitlements.all:', info.entitlements.all);
        logRevenueCat('log', 'Updating customerInfo state...');
        setCustomerInfo(info);
        logRevenueCat('log', '========== CUSTOMER INFO UPDATE COMPLETE ==========');
      }) as { remove: () => void } | undefined;
      
      if (subscription?.remove) {
        listenerCleanup = () => {
          logRevenueCat('log', 'Cleaning up customer info update listener');
          subscription.remove();
        };
        logRevenueCat('log', '✅ Customer info update listener registered');
      } else {
        logRevenueCat('log', '⚠️ Subscription does not have remove method');
      }
    } else {
      logRevenueCat('log', '⚠️ addCustomerInfoUpdateListener is not available on this platform');
    }

    return () => {
      logRevenueCat('log', 'Cleanup: Removing customer info update listener');
      listenerCleanup?.();
    };
  }, []);

  // Sync RevenueCat user identity with Clerk user ID
  useEffect(() => {
    logRevenueCat('log', '========== USER IDENTITY SYNC EFFECT ==========');
    logRevenueCat('log', 'Dependencies:', {
      isReady,
      isClerkLoaded,
      clerkUserId: user?.id ?? 'null',
      isInitialized,
      currentRevenueCatUserId: currentRevenueCatUserIdRef.current,
    });
    
    // Wait for both RevenueCat and Clerk to be ready
    // Skip if RevenueCat wasn't initialized (e.g., dev mode without API key)
    if (!isReady || !isClerkLoaded || !isInitialized) {
      logRevenueCat('log', '⏸️ Skipping sync - dependencies not ready');
      return;
    }

    const syncUserIdentity = async () => {
      logRevenueCat('log', '========== SYNC USER IDENTITY START ==========');
      try {
        const clerkUserId = user?.id ?? null;
        const currentRevenueCatUserId = currentRevenueCatUserIdRef.current;
        
        logRevenueCat('log', 'Sync state:', {
          clerkUserId,
          currentRevenueCatUserId,
          needsLogin: clerkUserId && clerkUserId !== currentRevenueCatUserId,
          needsLogout: !clerkUserId && currentRevenueCatUserId !== null,
        });

        // User signed in: log in to RevenueCat with Clerk user ID
        if (clerkUserId && clerkUserId !== currentRevenueCatUserId) {
          logRevenueCat('log', '🔐 Logging in user to RevenueCat');
          logRevenueCat('log', 'Clerk User ID:', clerkUserId);
          logRevenueCat('log', 'Previous RevenueCat User ID:', currentRevenueCatUserId);
          logRevenueCat('log', 'Setting isLoading=true');
          setIsLoading(true);
          
          logRevenueCat('log', 'Calling Purchases.logIn()...');
          const loginStartTime = Date.now();
          const { customerInfo: newInfo } = await Purchases.logIn(clerkUserId);
          const loginDuration = Date.now() - loginStartTime;
          logRevenueCat('log', '✅ Purchases.logIn() completed in', loginDuration, 'ms');
          logRevenueCat('log', 'Login response:', {
            originalAppUserId: newInfo.originalAppUserId,
            activeEntitlements: Object.keys(newInfo.entitlements.active),
            allEntitlements: Object.keys(newInfo.entitlements.all),
          });
          
          logRevenueCat('log', 'Updating currentRevenueCatUserIdRef to:', clerkUserId);
          currentRevenueCatUserIdRef.current = clerkUserId;
          logRevenueCat('log', 'Updating customerInfo state');
          setCustomerInfo(newInfo);
          
          // Refresh offerings after login
          logRevenueCat('log', 'Refreshing offerings after login...');
          const offeringsStartTime = Date.now();
          const offerings = await Purchases.getOfferings();
          const offeringsDuration = Date.now() - offeringsStartTime;
          logRevenueCat('log', '✅ Offerings refreshed in', offeringsDuration, 'ms');
          logRevenueCat('log', 'Offerings:', {
            hasCurrent: !!offerings.current,
            currentIdentifier: offerings.current?.identifier,
            availablePackages: offerings.current?.availablePackages.map(p => ({
              identifier: p.identifier,
              productId: p.product.identifier,
            })),
          });
          
          if (offerings.current) {
            setCurrentOffering(offerings.current);
            logRevenueCat('log', 'Current offering state updated');
          }
          
          logRevenueCat('log', 'Setting isLoading=false, error=null');
          setIsLoading(false);
          setError(null);
          logRevenueCat('log', '========== LOGIN SUCCESS ==========');
        }
        // User signed out: log out from RevenueCat
        else if (!clerkUserId && currentRevenueCatUserId !== null) {
          logRevenueCat('log', '🚪 Logging out user from RevenueCat');
          logRevenueCat('log', 'Previous RevenueCat User ID:', currentRevenueCatUserId);
          logRevenueCat('log', 'Setting isLoading=true');
          setIsLoading(true);
          
          logRevenueCat('log', 'Calling Purchases.logOut()...');
          const logoutStartTime = Date.now();
          const newInfo = await Purchases.logOut();
          const logoutDuration = Date.now() - logoutStartTime;
          logRevenueCat('log', '✅ Purchases.logOut() completed in', logoutDuration, 'ms');
          logRevenueCat('log', 'Logout response:', {
            originalAppUserId: newInfo.originalAppUserId,
            activeEntitlements: Object.keys(newInfo.entitlements.active),
          });
          
          logRevenueCat('log', 'Clearing currentRevenueCatUserIdRef');
          currentRevenueCatUserIdRef.current = null;
          logRevenueCat('log', 'Updating customerInfo state');
          setCustomerInfo(newInfo);
          
          logRevenueCat('log', 'Setting isLoading=false, error=null');
          setIsLoading(false);
          setError(null);
          logRevenueCat('log', '========== LOGOUT SUCCESS ==========');
        } else {
          logRevenueCat('log', 'ℹ️ No sync needed - user state unchanged');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync user identity';
        const errorDetails = err instanceof Error ? {
          message: err.message,
          name: err.name,
          stack: err.stack,
        } : { error: String(err) };
        
        logRevenueCat('error', '========== SYNC ERROR ==========');
        console.error('[RevenueCat] Error message:', errorMessage);
        console.error('[RevenueCat] Error details:', errorDetails);
        logRevenueCat('error', 'Setting error state and isLoading=false');
        setError(errorMessage);
        setIsLoading(false);
        logRevenueCat('error', '========== SYNC FAILED ==========');
      }
    };

    syncUserIdentity();
  }, [isReady, isClerkLoaded, user?.id, isInitialized]);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    logRevenueCat('log', '========== PURCHASE PACKAGE CALLED ==========');
    logRevenueCat('log', 'Package details:', {
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
      logRevenueCat('log', '❌ Purchase skipped - RevenueCat not initialized');
      return false;
    }
    
    try {
      logRevenueCat('log', 'Setting isLoading=true, error=null');
      setIsLoading(true);
      setError(null);
      
      logRevenueCat('log', 'Calling Purchases.purchasePackage()...');
      const purchaseStartTime = Date.now();
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      const purchaseDuration = Date.now() - purchaseStartTime;
      logRevenueCat('log', '✅ Purchases.purchasePackage() completed in', purchaseDuration, 'ms');
      
      logRevenueCat('log', 'Purchase response - Customer Info:', {
        originalAppUserId: newInfo.originalAppUserId,
        firstSeen: newInfo.firstSeen,
        requestDate: newInfo.requestDate,
        activeEntitlements: Object.keys(newInfo.entitlements.active),
        allEntitlements: Object.keys(newInfo.entitlements.all),
        managementURL: newInfo.managementURL,
      });
      
      logRevenueCat('log', 'Full entitlements.active:', newInfo.entitlements.active);
      logRevenueCat('log', 'Full entitlements.all:', newInfo.entitlements.all);
      
      logRevenueCat('log', 'Updating customerInfo state');
      setCustomerInfo(newInfo);
      
      // Check if purchase was successful - check specific entitlement or any entitlement
      const hasSpecificEntitlement = newInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
      const hasAnyEntitlement = Object.keys(newInfo.entitlements.active).length > 0;
      const hasEntitlement = hasSpecificEntitlement || hasAnyEntitlement;
      
      logRevenueCat('log', 'Purchase validation:', {
        entitlementId: ENTITLEMENT_ID,
        hasSpecificEntitlement,
        hasAnyEntitlement,
        hasEntitlement,
        purchaseSuccessful: hasEntitlement,
      });
      
      logRevenueCat('log', '========== PURCHASE SUCCESS ==========');
      return hasEntitlement;
    } catch (err) {
      const errorDetails = err instanceof Error ? {
        message: err.message,
        name: err.name,
        stack: err.stack,
        userCancelled: 'userCancelled' in err ? (err as { userCancelled?: boolean }).userCancelled : undefined,
      } : { error: String(err) };
      
      logRevenueCat('error', '========== PURCHASE ERROR ==========');
      console.error('[RevenueCat] Error details:', errorDetails);
      
      // Check if user cancelled
      if (err instanceof Error && 'userCancelled' in err && (err as { userCancelled?: boolean }).userCancelled) {
        logRevenueCat('log', 'ℹ️ User cancelled purchase (not an error)');
        logRevenueCat('log', '========== PURCHASE CANCELLED ==========');
        return false;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      console.error('[RevenueCat] Setting error state:', errorMessage);
      setError(errorMessage);
      logRevenueCat('error', '========== PURCHASE FAILED ==========');
      return false;
    } finally {
      logRevenueCat('log', 'Setting isLoading=false');
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    logRevenueCat('log', '========== RESTORE PURCHASES CALLED ==========');
    
    if (!isInitialized) {
      logRevenueCat('log', '❌ Restore skipped - RevenueCat not initialized');
      return false;
    }
    
    try {
      logRevenueCat('log', 'Setting isLoading=true, error=null');
      setIsLoading(true);
      setError(null);
      
      logRevenueCat('log', 'Calling Purchases.restorePurchases()...');
      const restoreStartTime = Date.now();
      const info = await Purchases.restorePurchases();
      const restoreDuration = Date.now() - restoreStartTime;
      logRevenueCat('log', '✅ Purchases.restorePurchases() completed in', restoreDuration, 'ms');
      
      logRevenueCat('log', 'Restore response - Customer Info:', {
        originalAppUserId: info.originalAppUserId,
        firstSeen: info.firstSeen,
        requestDate: info.requestDate,
        activeEntitlements: Object.keys(info.entitlements.active),
        allEntitlements: Object.keys(info.entitlements.all),
        managementURL: info.managementURL,
      });
      
      logRevenueCat('log', 'Full entitlements.active:', info.entitlements.active);
      logRevenueCat('log', 'Full entitlements.all:', info.entitlements.all);
      
      logRevenueCat('log', 'Updating customerInfo state');
      setCustomerInfo(info);
      
      // Check if restore found entitlements - check specific or any
      const hasSpecificEntitlement = info.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
      const hasAnyEntitlement = Object.keys(info.entitlements.active).length > 0;
      const hasEntitlement = hasSpecificEntitlement || hasAnyEntitlement;
      
      logRevenueCat('log', 'Restore validation:', {
        entitlementId: ENTITLEMENT_ID,
        hasSpecificEntitlement,
        hasAnyEntitlement,
        hasEntitlement,
        restoreFoundSubscription: hasEntitlement,
      });
      
      logRevenueCat('log', '========== RESTORE COMPLETE ==========');
      return hasEntitlement;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      const errorDetails = err instanceof Error ? {
        message: err.message,
        name: err.name,
        stack: err.stack,
      } : { error: String(err) };
      
      logRevenueCat('error', '========== RESTORE ERROR ==========');
      console.error('[RevenueCat] Error message:', errorMessage);
      console.error('[RevenueCat] Error details:', errorDetails);
      logRevenueCat('error', 'Setting error state');
      setError(errorMessage);
      logRevenueCat('error', '========== RESTORE FAILED ==========');
      return false;
    } finally {
      logRevenueCat('log', 'Setting isLoading=false');
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Refresh customer info
  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    logRevenueCat('log', '========== REFRESH CUSTOMER INFO CALLED ==========');
    
    if (!isInitialized) {
      logRevenueCat('log', '❌ Refresh skipped - RevenueCat not initialized');
      return;
    }
    
    try {
      logRevenueCat('log', 'Calling Purchases.getCustomerInfo()...');
      const refreshStartTime = Date.now();
      const info = await Purchases.getCustomerInfo();
      const refreshDuration = Date.now() - refreshStartTime;
      logRevenueCat('log', '✅ Purchases.getCustomerInfo() completed in', refreshDuration, 'ms');
      
      logRevenueCat('log', 'Refresh response - Customer Info:', {
        originalAppUserId: info.originalAppUserId,
        firstSeen: info.firstSeen,
        requestDate: info.requestDate,
        activeEntitlements: Object.keys(info.entitlements.active),
        allEntitlements: Object.keys(info.entitlements.all),
        managementURL: info.managementURL,
      });
      
      logRevenueCat('log', 'Full entitlements.active:', info.entitlements.active);
      logRevenueCat('log', 'Full entitlements.all:', info.entitlements.all);
      
      logRevenueCat('log', 'Updating customerInfo state, clearing error');
      setCustomerInfo(info);
      setError(null);
      logRevenueCat('log', '========== REFRESH SUCCESS ==========');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh subscription status';
      const errorDetails = err instanceof Error ? {
        message: err.message,
        name: err.name,
        stack: err.stack,
      } : { error: String(err) };
      
      logRevenueCat('error', '========== REFRESH ERROR ==========');
      console.error('[RevenueCat] Error message:', errorMessage);
      console.error('[RevenueCat] Error details:', errorDetails);
      logRevenueCat('error', 'Setting error state');
      setError(errorMessage);
      logRevenueCat('error', '========== REFRESH FAILED ==========');
    }
  }, [isInitialized]);

  // Log state changes
  useEffect(() => {
    logRevenueCat('log', 'State changed:', {
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

  logRevenueCat('log', 'Rendering RevenueCatProvider with context value');
  
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
  logRevenueCat('log', 'useRevenueCat hook called');
  const context = useContext(RevenueCatContext);
  if (!context) {
    logRevenueCat('error', '❌ useRevenueCat called outside RevenueCatProvider');
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  logRevenueCat('log', 'useRevenueCat returning context:', {
    isReady: context.isReady,
    isInitialized: context.isInitialized,
    isSubscribed: context.isSubscribed,
    isLoading: context.isLoading,
  });
  return context;
}

// Convenience hook for checking subscription status
export function useSubscription() {
  logRevenueCat('log', 'useSubscription hook called');
  const { isSubscribed, isLoading, isReady, initializationFailed, error } = useRevenueCat();
  const result = { 
    isSubscribed, 
    isLoading: isLoading || !isReady,
    initializationFailed,
    error,
  };
  logRevenueCat('log', 'useSubscription returning:', result);
  return result;
}

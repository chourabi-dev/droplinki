import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { DeliveryProvider } from "@/context/DeliveryContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppLayout } from "@/components/AppLayout";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Deliveries from "@/pages/Deliveries";
import DeliveryDetails from "@/pages/DeliveryDetails";
import CreateDelivery from "@/pages/CreateDelivery";
import DeliveriesMap from "@/pages/DeliveriesMap";
import Profile from "@/pages/Profile";
import CustomerTracking from "@/pages/CustomerTracking";
import TermsOfUse from "@/pages/TermsOfUse";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/NotFound";

// --- Company / Pro space -----------------------------------------------
// Entirely separate app mounted under /company/*, with its own auth,
// providers and layout (src/components/company/CompanyLayout.tsx). It
// shares only generic, stateless building blocks with the driver app
// (ToastProvider, ui/* primitives, MapView) — no routes, storage keys or
// contexts are shared, so the two apps never interfere with each other.
import { CompanyAuthProvider } from "@/context/CompanyAuthContext";
import { CompanyDriverProvider } from "@/context/CompanyDriverContext";
import { CompanyDeliveryProvider } from "@/context/CompanyDeliveryContext";
import { CompanyGeoProvider } from "@/context/CompanyGeoContext";
import { CompanyDeliveryZoneProvider } from "@/context/CompanyDeliveryZoneContext";
import { CompanyLayout } from "@/components/company/CompanyLayout";
import CompanyLanding from "@/pages/company/CompanyLanding";
import CompanyLogin from "@/pages/company/CompanyLogin";
import CompanySignup from "@/pages/company/CompanySignup";
import CompanyDashboard from "@/pages/company/CompanyDashboard";
import CompanyDrivers from "@/pages/company/CompanyDrivers";
import CompanyDeliveryZones from "@/pages/company/CompanyDeliveryZones";
import CompanyDeliveries from "@/pages/company/CompanyDeliveries";
import CompanyDeliveryDetails from "@/pages/company/CompanyDeliveryDetails";
import CompanyCreateDelivery from "@/pages/company/CompanyCreateDelivery";
import CompanyImportDeliveries from "@/pages/company/CompanyImportDeliveries";
import CompanyStats from "@/pages/company/CompanyStats";
import CompanySettings from "@/pages/company/CompanySettings";

export default function App() {
  return (
    <AuthProvider>
      <DeliveryProvider>
        <CompanyAuthProvider>
          <CompanyGeoProvider>
            <CompanyDeliveryZoneProvider>
              <CompanyDriverProvider>
                <CompanyDeliveryProvider>
                  <ToastProvider>
                    <BrowserRouter>
                      <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/terms-of-use" element={<TermsOfUse />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

                        {/* Public customer-facing tracking page — no auth required */}
                        <Route path="/d/:deliveryId" element={<CustomerTracking />} />

                        {/* Authenticated driver app */}
                        <Route element={<AppLayout />}>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/deliveries" element={<Deliveries />} />
                          <Route path="/deliveries/:id" element={<DeliveryDetails />} />
                          <Route path="/create-delivery" element={<CreateDelivery />} />
                          <Route path="/map" element={<DeliveriesMap />} />
                          <Route path="/profile" element={<Profile />} />
                        </Route>

                        {/* Company / Pro app — own URL namespace, own auth, own layout */}
                        <Route path="/company" element={<CompanyLanding />} />
                        <Route path="/company/login" element={<CompanyLogin />} />
                        <Route path="/company/signup" element={<CompanySignup />} />
                        <Route element={<CompanyLayout />}>
                          <Route path="/company/dashboard" element={<CompanyDashboard />} />
                          <Route path="/company/drivers" element={<CompanyDrivers />} />
                          <Route path="/company/delivery-zones" element={<CompanyDeliveryZones />} />
                          <Route path="/company/deliveries" element={<CompanyDeliveries />} />
                          <Route path="/company/deliveries/new" element={<CompanyCreateDelivery />} />
                          <Route path="/company/deliveries/import" element={<CompanyImportDeliveries />} />
                          <Route path="/company/deliveries/:id" element={<CompanyDeliveryDetails />} />
                          <Route path="/company/stats" element={<CompanyStats />} />
                          <Route path="/company/settings" element={<CompanySettings />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                  </ToastProvider>
                </CompanyDeliveryProvider>
              </CompanyDriverProvider>
            </CompanyDeliveryZoneProvider>
          </CompanyGeoProvider>
        </CompanyAuthProvider>
      </DeliveryProvider>
    </AuthProvider>
  );
}
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

export default function App() {
  return (
    <AuthProvider>
      <DeliveryProvider>
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </DeliveryProvider>
    </AuthProvider>
  );
}
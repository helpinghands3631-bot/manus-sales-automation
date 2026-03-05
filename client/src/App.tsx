import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import AgencyProfile from "./pages/AgencyProfile";
import WebsiteAudit from "./pages/WebsiteAudit";
import AIChat from "./pages/AIChat";
import Campaigns from "./pages/Campaigns";
import SuburbPages from "./pages/SuburbPages";
import AuditHistory from "./pages/AuditHistory";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import CompetitorAudit from "./pages/CompetitorAudit";
import Onboarding from "./pages/Onboarding";
import MonthlyDigest from "./pages/MonthlyDigest";
import MarketingResources from "./pages/MarketingResources";
import UsageDashboard from "./pages/UsageDashboard";
import Referral from "./pages/Referral";
import AppraisalLetter from "./pages/AppraisalLetter";
import ListingDescription from "./pages/ListingDescription";
import WebhookSettings from "./pages/WebhookSettings";
import GrokChat from "./pages/GrokChat";
import WebhookConnections from "./pages/WebhookConnections";
import CommandCentre from "./pages/CommandCentre";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import DemoPage from "./pages/DemoPage";

/** Wraps a page component with the sidebar DashboardLayout */
function WithDashboard({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/demo/:id" component={DemoPage} />

      {/* Dashboard routes — each renders inside DashboardLayout */}
      <Route path="/dashboard">
        <WithDashboard><Dashboard /></WithDashboard>
      </Route>
      <Route path="/agency">
        <WithDashboard><AgencyProfile /></WithDashboard>
      </Route>
      <Route path="/audit">
        <WithDashboard><WebsiteAudit /></WithDashboard>
      </Route>
      <Route path="/chat">
        <WithDashboard><AIChat /></WithDashboard>
      </Route>
      <Route path="/campaigns">
        <WithDashboard><Campaigns /></WithDashboard>
      </Route>
      <Route path="/suburb-pages">
        <WithDashboard><SuburbPages /></WithDashboard>
      </Route>
      <Route path="/audit-history">
        <WithDashboard><AuditHistory /></WithDashboard>
      </Route>
      <Route path="/subscription">
        <WithDashboard><Subscription /></WithDashboard>
      </Route>
      <Route path="/competitor-audit">
        <WithDashboard><CompetitorAudit /></WithDashboard>
      </Route>
      <Route path="/admin">
        <WithDashboard><Admin /></WithDashboard>
      </Route>
      <Route path="/digest">
        <WithDashboard><MonthlyDigest /></WithDashboard>
      </Route>
      <Route path="/marketing-resources">
        <WithDashboard><MarketingResources /></WithDashboard>
      </Route>
      <Route path="/usage">
        <WithDashboard><UsageDashboard /></WithDashboard>
      </Route>
      <Route path="/referral">
        <WithDashboard><Referral /></WithDashboard>
      </Route>
      <Route path="/appraisal-letter">
        <WithDashboard><AppraisalLetter /></WithDashboard>
      </Route>
      <Route path="/listing-description">
        <WithDashboard><ListingDescription /></WithDashboard>
      </Route>
      <Route path="/webhooks">
        <WithDashboard><WebhookSettings /></WithDashboard>
      </Route>
      <Route path="/grok-chat">
        <WithDashboard><GrokChat /></WithDashboard>
      </Route>
      <Route path="/webhook-connections">
        <WithDashboard><WebhookConnections /></WithDashboard>
      </Route>
      <Route path="/command-centre">
        <WithDashboard><CommandCentre /></WithDashboard>
      </Route>

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

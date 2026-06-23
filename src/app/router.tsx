/**
 * @file router.tsx
 * @description 발품 앱 라우팅 정의. 로그인/목록/상세 작성 화면을 연결한다.
 */
import { Navigate, createBrowserRouter, useParams } from "react-router-dom";

import { MobileShell } from "./MobileShell";
import { RequireAuth } from "./RequireAuth";
import { ActivityPage } from "../pages/ActivityPage";
import { ProfilePage } from "../pages/ProfilePage";
import { PropertyDetailPage } from "../pages/PropertyDetailPage";
import { PropertyEditorPage } from "../pages/PropertyEditorPage";
import { PropertyListPage } from "../pages/PropertyListPage";
import { FavoritesPage } from "../pages/activity/FavoritesPage";
import { HistoryPage } from "../pages/activity/HistoryPage";
import { RatedItemsPage } from "../pages/activity/RatedItemsPage";
import { RecentViewsPage } from "../pages/activity/RecentViewsPage";
import { LoginPage } from "../pages/LoginPage";

function PropertyEditRedirect() {
  const { propertyId } = useParams();
  return <Navigate to={`/properties/${propertyId}`} replace />;
}

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <MobileShell />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <PropertyListPage />
          </RequireAuth>
        ),
      },
      {
        path: "map",
        element: <Navigate to="/" replace />,
      },
      {
        path: "activity",
        element: (
          <RequireAuth>
            <ActivityPage />
          </RequireAuth>
        ),
      },
      {
        path: "activity/history",
        element: (
          <RequireAuth>
            <HistoryPage />
          </RequireAuth>
        ),
      },
      {
        path: "activity/favorites",
        element: (
          <RequireAuth>
            <FavoritesPage />
          </RequireAuth>
        ),
      },
      {
        path: "activity/recent",
        element: (
          <RequireAuth>
            <RecentViewsPage />
          </RequireAuth>
        ),
      },
      {
        path: "activity/ratings",
        element: (
          <RequireAuth>
            <RatedItemsPage />
          </RequireAuth>
        ),
      },
      {
        path: "profile",
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: "properties/new",
        element: (
          <RequireAuth>
            <PropertyEditorPage />
          </RequireAuth>
        ),
      },
      {
        path: "properties/:propertyId/edit",
        element: (
          <RequireAuth>
            <PropertyEditRedirect />
          </RequireAuth>
        ),
      },
      {
        path: "properties/:propertyId",
        element: (
          <RequireAuth>
            <PropertyDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "choose-actor",
        element: <Navigate to="/login" replace />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

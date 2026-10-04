import { createBrowserRouter, redirect } from 'react-router'
import AppShell from './components/layout/AppShell'
import Billing from './routes/Billing'
import Consult from './routes/Consult'
import Imaging from './routes/Imaging'
import NotFound from './routes/NotFound'
import Operatory from './routes/Operatory'
import Providers from './routes/Providers'
import Reception from './routes/Reception'
import Records from './routes/Records'

/** One route per room. Each room is a normal, linkable page (e.g. /billing#network). */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      // No landing page: the site opens straight into Reception.
      { index: true, loader: () => redirect('/reception') },
      { path: 'reception', element: <Reception /> },
      { path: 'operatory', element: <Operatory /> },
      { path: 'imaging', element: <Imaging /> },
      { path: 'consult', element: <Consult /> },
      { path: 'billing', element: <Billing /> },
      { path: 'providers', element: <Providers /> },
      { path: 'records', element: <Records /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

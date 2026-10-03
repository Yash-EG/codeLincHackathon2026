import { createBrowserRouter } from 'react-router'
import AppShell from './components/layout/AppShell'
import Billing from './routes/Billing'
import Consult from './routes/Consult'
import Entrance from './routes/Entrance'
import Hallway from './routes/Hallway'
import Imaging from './routes/Imaging'
import NotFound from './routes/NotFound'
import Operatory from './routes/Operatory'
import Reception from './routes/Reception'
import Records from './routes/Records'

/** One route per room. Each room is a normal, linkable page (e.g. /billing#network). */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Entrance /> },
      { path: 'reception', element: <Reception /> },
      { path: 'hallway', element: <Hallway /> },
      { path: 'operatory', element: <Operatory /> },
      { path: 'imaging', element: <Imaging /> },
      { path: 'consult', element: <Consult /> },
      { path: 'billing', element: <Billing /> },
      { path: 'records', element: <Records /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

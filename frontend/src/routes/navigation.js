import {
  Activity,
  Atom,
  BookOpenText,
  ChartNoAxesCombined,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  Trophy,
} from 'lucide-react'

export const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Datasets', to: '/datasets', icon: Database },
  { label: 'Validation', to: '/validation', icon: ClipboardCheck },
  { label: 'Feature Analysis', to: '/features', icon: ChartNoAxesCombined },
  { label: 'Experiments', to: '/experiments', icon: Activity },
  { label: 'Results', to: '/results', icon: Trophy },
  { label: 'Documentation', to: '/documentation', icon: BookOpenText },
]

export function getPageTitle(pathname) {
  if (pathname === '/experiments/new') {
    return 'New Experiment'
  }
  if (pathname.startsWith('/experiments/') && pathname !== '/experiments') {
    return 'Experiment Details'
  }
  if (pathname.startsWith('/datasets/') && pathname !== '/datasets') {
    return 'Dataset Details'
  }
  return navigation.find((item) => item.to === pathname)?.label ?? 'Page not found'
}

export { Atom }

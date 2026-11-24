import { Route, Routes } from 'react-router-dom'
import AppErrorBoundary from './components/common/AppErrorBoundary.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import SectionPlaceholderPage from './pages/SectionPlaceholderPage.jsx'

import DatasetsPage from './features/datasets/pages/DatasetsPage.jsx'
import DatasetDetailPage from './features/datasets/pages/DatasetDetailPage.jsx'
import ExperimentsPage from './features/experiments/pages/ExperimentsPage.jsx'
import CreateExperimentPage from './features/experiments/pages/CreateExperimentPage.jsx'
import ExperimentDetailPage from './features/experiments/pages/ExperimentDetailPage.jsx'

const placeholderSections = [
  { path: 'validation', title: 'Validation' },
  { path: 'features', title: 'Feature Analysis' },
  { path: 'results', title: 'Results' },
  { path: 'documentation', title: 'Documentation' },
]

export default function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="datasets" element={<DatasetsPage />} />
          <Route path="datasets/:datasetId" element={<DatasetDetailPage />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="experiments/new" element={<CreateExperimentPage />} />
          <Route path="experiments/:experimentId" element={<ExperimentDetailPage />} />
          {placeholderSections.map((section) => (
            <Route
              key={section.path}
              path={section.path}
              element={<SectionPlaceholderPage title={section.title} />}
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppErrorBoundary>
  )
}

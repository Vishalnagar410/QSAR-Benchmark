import PageHeader from './PageHeader.jsx'

export default function PageContainer({
  title,
  description,
  eyebrow = 'QSAR-Benchmark',
  actions,
  children,
}) {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
      <PageHeader
        actions={actions}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      {children}
    </main>
  )
}

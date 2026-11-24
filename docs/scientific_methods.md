# Scientific methods: data, features, splitting, and baselines

The project validates input records and calculates molecular features before
Stage 3 regression benchmarking. Activities remain the finite numeric values
supplied by the user; no pActivity conversion, unit conversion, aggregation,
imputation, or endpoint inference is performed.

## Input and endpoint handling

The required CSV columns default to `compound_id`, `smiles`, and `activity`.
Optional columns default to `endpoint`, `units`, and `assay_id`. Column names
are configurable. When endpoint or unit columns are absent, supply their values
explicitly. A dataset with more than one observed endpoint, unit, or assay
requires explicit selection; records outside a supplied selection are retained
in the audit and excluded from the selected dataset. Endpoint compatibility is
never inferred from labels or column names.

Activity values must be finite numeric values. Missing, non-numeric, censored,
and qualifier-prefixed values are excluded with source-row-specific reasons.
Activities are not converted, imputed, or averaged.

## Source rows and molecular identity

`source_row` is the one-based logical data-record number, excluding the CSV
header. Every parsed input row retains its original field values in memory and
in `record_audit.csv`. Invalid structures remain auditable but do not produce
features. Reports use the source filename rather than the absolute input path,
and do not assert that supplied activity values are experimentally measured.

RDKit parses and sanitizes SMILES using its standard parser, then writes
canonical isomeric SMILES. This canonical representation is an identity key;
it does not remove salts, normalize tautomers or charges, or discard
stereochemistry.

## Calculated features

The descriptor names are explicitly prefixed `rdkit_` to distinguish them from
experimental measurements:

- Molecular weight (`Descriptors.MolWt`)
- Crippen MolLogP (`Crippen.MolLogP`)
- Topological polar surface area (`rdMolDescriptors.CalcTPSA`)
- Hydrogen-bond donors and acceptors (`Lipinski.NumHDonors` and
  `Lipinski.NumHAcceptors`)
- Rotatable bonds (`Lipinski.NumRotatableBonds`)
- Heavy-atom count (`Descriptors.HeavyAtomCount`)
- Ring count (`rdMolDescriptors.CalcNumRings`)

Optional Morgan fingerprints use an explicit radius, bit count, and
chirality-inclusion setting. The defaults are radius 2, 2048 bits, and chirality
included. Features are calculated from each valid structure; experimental
activity is retained as supplied.

## Duplicate structures and replicate policy

Rows with valid activity, identifiers, selected metadata, and parsed structures
are grouped by canonical isomeric SMILES. Every group records its canonical
structure, source rows, and compound identifiers, including structurally
valid rows excluded for other reasons. Modeling is blocked by default when
more than one modeling-eligible row shares a structure.
`DatasetResult.assert_modeling_ready()` enforces that rule through the
`ReplicatePolicy` interface. No replicate is dropped or averaged. Stage 2
does not implement replicate aggregation.

Stage 3 forms a numeric matrix only from accepted `DatasetResult.records`.
Every feature and target row remains aligned with its compound ID, one-based
source row, and canonical isomeric SMILES. Preparation requires the caller to
name exactly one endpoint and units, and verifies that every accepted record
matches those selections.

## Splits and baseline models

Random splitting uses a fixed seed and a configurable test fraction. It may
place close analogues or members of the same scaffold in both partitions.
Bemis–Murcko splitting keeps each scaffold group intact. All acyclic
molecules have the empty Murcko scaffold and are assigned to one common group;
this is an explicit conservative policy that may produce an approximate test
fraction or make a valid two-part split impossible. If the requested scaffold
split cannot keep groups intact and create non-empty train and test partitions,
the request fails instead of falling back to random splitting.

Both splits reject duplicate canonical structures under the Stage 2 default
replicate policy. No accepted record is silently removed to make a split fit.
Scaffold splitting is a partitioning method, not proof of independent
chemical space.

Three fixed regression baselines are fit independently on the same training
rows: a mean `DummyRegressor` reference, a `Ridge(alpha=1.0)` model preceded
by a training-fitted `StandardScaler`, and a 200-tree
`RandomForestRegressor` with a fixed seed and no scaling. There is no
hyperparameter search, feature selection, imputation, or cross-validation.
Evaluation metrics and limitations are documented in the
[evaluation protocol](evaluation_protocol.md).

## Limitations

RDKit sanitization and canonicalization are not a complete chemical
standardization protocol. Descriptor calculations depend on the pinned RDKit
version. Morgan fingerprints are a representation, not a calibrated measure
of similarity or uncertainty. This layer does not establish assay
comparability, model validity, applicability domain, or prospective
performance. Random and scaffold split limitations are described in
[limitations](limitations.md).

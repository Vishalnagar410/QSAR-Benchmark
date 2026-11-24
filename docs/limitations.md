# Limitations

## Chemical identity and features

Canonical isomeric SMILES from the pinned RDKit build are used as structure
identity keys. This is not a full chemical standardization protocol: salts,
tautomers, charges, and stereochemistry are not normalized away. Descriptor
values depend on RDKit's implementation and version. Morgan fingerprints and
the included descriptors do not provide calibrated uncertainty or an
applicability-domain assessment.

## Endpoint, activity, and assay

Only one caller-selected endpoint and exact unit label are used in a modelling
run. Endpoint names do not imply compatible units or assay conditions. The
software does not convert units, convert to pActivity, aggregate replicate
measurements, impute missing activity values, or assess assay comparability.
Supplied numeric activities are not independently verified as experimental.

## Splitting

A random split is reproducible for a fixed dataset and seed, but may place
close analogues, duplicate-like chemistry, or the same scaffold in both
partitions. Stage 2's duplicate-structure policy rejects accepted records with
identical canonical structures.

A Bemis–Murcko split keeps exact scaffold groups intact, but group sizes may
cause an imprecise test fraction or an infeasible split. Acyclic molecules all
have an empty Murcko scaffold and are conservatively grouped together. Scaffold
definitions do not capture every aspect of structural similarity, and a
scaffold split does **not** prove independent chemical space or guarantee
prospective performance.

## Models and metrics

The three models are fixed baselines, not tuned production models. There is no
cross-validation, hyperparameter optimization, feature selection, imputation,
uncertainty estimation, or applicability-domain analysis. A single holdout
score can be sensitive to the split and dataset size. R² is undefined for a
single test sample or constant test labels and is reported as null with an
explicit limitation; RMSE and MAE do not resolve those design limitations.

No external experimental dataset validation is claimed. Synthetic test data
are software fixtures only and must never be cited as predictive evidence.

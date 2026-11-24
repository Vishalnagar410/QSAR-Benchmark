# Evaluation protocol

## Dataset selection and preparation

Call Stage 2 `load_dataset` first. Only its accepted records enter the
modelling matrix; exclusions remain in the Stage 2 audit and are not silently
discarded during Stage 3. `prepare_modeling_dataset` requires explicit,
non-empty endpoint and units arguments and checks exact equality against the
validated selection and every record. It does not infer or convert units.

The default Stage 2 duplicate-structure policy is applied before modelling.
If multiple accepted records have the same canonical isomeric SMILES,
preparation raises `DuplicateStructureError`. No measurements are averaged,
removed, or otherwise resolved. Feature rows, activities, compound IDs,
source-row numbers, and canonical structures are aligned one-to-one.

## Splitting

`split_dataset` accepts `strategy="random"` or `strategy="scaffold"`, a
`test_fraction` strictly between zero and one, and a non-negative integer
`random_seed`. At least two accepted compounds are required. Both partitions
must be non-empty, and the index sets must be disjoint.

* **Random:** scikit-learn `train_test_split` shuffles row indices with the
  supplied seed. The test size follows scikit-learn's fractional holdout
  behavior. Similar compounds or scaffold groups can occur in both partitions.
* **Scaffold:** RDKit Bemis–Murcko scaffolds group molecules before assignment.
  Groups are ordered by decreasing size, with seeded tie-breaking, then greedily
  assigned toward the requested test count. Acyclic structures share one empty
  scaffold group. The resulting partition size may differ from the requested
  fraction because groups are indivisible. Infeasible splits raise `SplitError`;
  there is no random fallback.

The output records train/test sample and scaffold-group counts. A scaffold
split does not establish chemical independence or prospective validity.

## Models and leakage controls

The benchmark fits exactly these fixed estimators:

| Model | Configuration | Rationale |
|---|---|---|
| Mean dummy | `DummyRegressor(strategy="mean")` | Reference performance against a constant training-target mean. |
| Ridge | `StandardScaler()` then `Ridge(alpha=1.0)` | Regularized linear baseline for differently scaled descriptors; scaler is fit within a scikit-learn pipeline on training rows only. |
| Random forest | `n_estimators=200`, `criterion="squared_error"`, `max_features=1.0`, `min_samples_leaf=1`, fixed `random_state`, `n_jobs=1` | Nonlinear tree baseline without unnecessary feature scaling. |

Each estimator is freshly constructed and fitted independently on the same
training rows. Every model predicts the same untouched test rows. Test labels
are used only for metric calculation; they do not participate in scaling,
feature selection, fitting, parameter selection, or model selection. No
hyperparameter tuning, feature selection, imputation, or cross-validation is
performed.

## Metrics and status

Each model result contains R², root mean squared error (RMSE), mean absolute
error (MAE), training/test sample counts, configuration, and the partition's
compound IDs and source-row references.

* Negative R² is retained.
* R² is reported as `null` with a limitation when fewer than two test samples
  are available or the test targets are constant. RMSE and MAE remain
  calculable for a non-empty test set.
* NaN or infinite targets/predictions are rejected; non-finite predictions are
  never converted to metric values.
* An evaluation with undefined R² has status `partial`, not a fabricated
  complete score.

## Run metadata and reproducibility

`BenchmarkRun.to_dict()` and `write_benchmark_results()` produce JSON
containing a deterministic run identifier, record count, endpoint and units,
split and seed, test fraction, split counts, Stage 2 feature configuration,
model configurations and scores, Python/RDKit/NumPy/scikit-learn versions,
and warnings/metric limitations. The identifier hashes the input feature and
target arrays, compound identities, settings, and relevant software versions.
Exact model outcomes can still depend on changes to dependency versions or
runtime behavior, so the recorded versions are part of the run provenance.

Test fixtures are deterministic synthetic examples used to test code paths.
They are illustrative only and are not measured experimental data or evidence
of predictive performance.

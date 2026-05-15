---
layout: distill
published: false
title: Are We Evaluating CoT Faithfulness Correctly?
description: Faithfulness evaluations mistake faithfulness for plausibility and importance, or lack a clear theoretical foundation.
tags: Faithfulness Reasoning CoT Interpretability AI ML
giscus_comments: false
date: 2026-05-10
featured: false
pretty_table: true
citation: true

authors:
  - name: Yoav Gur-Arieh
    url: "https://yoav.ml"
    affiliations:
      name: Tel Aviv University

  - name: Ana Marasović
    url: "https://www.anamarasovic.com/"
    affiliations:
      name: University of Utah


  - name: Mor Geva
    url: "https://mega002.github.io/"
    affiliations:
      name: Tel Aviv University


bibliography: on-faithfulness.bib

thumbnail: assets/img/faith_thumbnail.png

---



### Introduction
Chains of thought (CoTs) have become a staple of how LLMs solve complex problems, whether elicited by prompting<d-cite key="wei2022chain"/> or trained in as extended internal deliberation<d-cite key="kojima2022large, o1, Guo_2025"/>. Because these traces look like a window into the model's reasoning, they have been seized on as a unique opportunity for AI safety, supposedly enabling direct and transparent oversight of model behavior<d-cite key="korbak2025chainthoughtmonitorabilitynew, openai2026monitoring"/>. But a growing body of work shows that CoTs are not necessarily *faithful* to the model's underlying computations<d-cite key="turpin2023language, chen2025reasoningmodelsdontsay, arcuschin2026biasesblindspotdetecting"/>: they can misrepresent the factors influencing a model's decisions, and serve as post-hoc rationalizations for predetermined answers.

In response, the field has produced a steady stream of methods for evaluating CoT faithfulness, along with benchmarks and meta-evaluations of those methods<d-cite key="parcalabescu-frank-2024-measuring, agarwal2024faithfulnessvsplausibilityunreliability, shen2026faithcotbench, chang2026rauditblindauditingprotocol, mittal2026c2faithbenchmarkingllmjudges"/>. **We argue, however, that current evaluations of CoT faithfulness are conceptually misaligned with how faithfulness is defined, and therefore systematically mis-measure it.** This is not a pedantic complaint. A miscalibrated faithfulness metric can offer false assurances about an LLM's trustworthiness, or cast unwarranted suspicion on a model whose CoT is in fact a reasonable account of its reasoning --- both failure modes that matter in any setting where we want CoT to support oversight.

We make the argument by first examining how faithfulness is defined in the literature, and then walking through how prominent evaluations operationalize that definition. The pattern that emerges is consistent: operationalizations conflate faithfulness with other properties of CoTs --- chiefly *plausibility* and *importance*. We hope this serves as a call to action: before we can trust faithfulness metrics to underwrite safety claims, we have to be sure they are measuring faithfulness at all.


### Defining Faithfulness
Following Jacovi and Goldberg<d-cite key="jacovi-goldberg-2020-towards" />, faithfulness is overwhelmingly defined in the literature as **the correspondence between a CoT (or explanation) and the model's true internal reasoning process**. A faithful CoT, in other words, accurately describes the computation the model actually performed. Some works augment this with an additional requirement of a causal relationship between the CoT and the model's prediction<d-cite key="siegel-etal-2024-probabilities,bao-etal-2025-likely"/>, or legibility to humans<d-cite key="chen2025reasoningmodelsdontsay"/>. The definition is sometimes criticized as unactionable, but we adopt it here both because it remains the field's working consensus and because it sets an ambitious north star that any faithfulness evaluation should aspire to meet.

### Evaluating Faithfulness Incorrectly
With the definition in hand, we can ask how it is actually operationalized. Reviewing the literature, the same pattern shows up over and over: faithfulness gets conflated with other, distinct properties of CoTs --- most often *plausibility* and *importance*.


#### Faithfulness vs. Plausibility
Plausibility is whether a CoT describes a reasonable and convincing process by which the model *could have* reached its answer<d-cite key="jacovi-goldberg-2020-towards"/>. The distinction between plausibility and faithfulness has been argued before<d-cite key="jacovi-goldberg-2020-towards,agarwal2024faithfulnessvsplausibilityunreliability"/>, but the conflation remains pervasive<d-cite key="Lundberg2017AUA, poerner-etal-2018-evaluating, wu-mooney-2019-faithful, zaman-srivastava-2025-causal, shen2026faithcotbench, cot-may-be-highly-informative-despite-unfaithfulness, chang2026rauditblindauditingprotocol, arcuschin2025chainofthought, mittal2026c2faithbenchmarkingllmjudges"/>.

The crux is this: plausibility asks whether a CoT *makes sense* to a human reader, and is usually measured by having human annotators judge whether the reasoning hangs together. But LLMs can arrive at correct answers in ways a human wouldn't anticipate, and they can also produce smooth, convincing prose that has nothing to do with the computation they actually ran. As Figure&nbsp;<a href="#faith_v_plaus">1</a> shows, conflating faithfulness with plausibility cuts both ways: a faithful account of unusual-looking reasoning gets marked as unfaithful, and a fluent post-hoc rationalization gets marked as faithful.

<figure id="faith_v_plaus" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/faith_v_plaus.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/faith_v_plaus.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 1</strong>: Conflating plausibility and faithfulness happens when we confuse how we think the model ought to have solved a task with how it actually must have solved it. Here, we assume the only way the model could have solved the task is by going through steps A→B→C. In reality, the model solved it by going A→Q→C. A CoT that faithfully reports this is wrongly marked unfaithful (left), while a CoT that misrepresents it as A→B→C is wrongly marked faithful (right).
  </figcaption>
</figure>

<br />

Recent benchmarks illustrate the conflation in practice. FaithCoT-Bench<d-cite key="shen2026faithcotbench"/> labels CoTs as unfaithful when annotators judge the reasoning path implausible or wrong. In one of their appendix examples (Figure&nbsp;<a href="#faithcot_example">2</a>), the model is asked "*What did 'coma' originally stand for?*" and answers correctly, grounding its response in the fact that *coma* derives from the Greek κῶμα. The annotators marked this reasoning as unfaithful, but their justification turns on the perceived logical structure of the argument, not on any evidence that the model did or did not actually perform the steps it describes.


<figure id="faithcot_example" class="l-gutter">
  <a href="{{ '/assets/img/faithcot_coma_example.png' | relative_url }}" target="_blank">
    <img src="{{ '/assets/img/faithcot_coma_example.png' | relative_url }}"
         alt="A FaithCoT-Bench TruthfulQA example labeled unfaithful for overturning previous reasoning"
         style="width: 100%;">
  </a>
  <figcaption>
    <strong>Figure 2</strong>: An example from FaithCoT-Bench labeled as unfaithful since its CoT was judged to be implausible. 
  </figcaption>
</figure>

A second example comes from Arcuschin et al.<d-cite key="arcuschin2025chainofthought"/>, who detect unfaithfulness by generating CoTs for pairs of logically equivalent questions ("Is X south of Y?" vs. "Is Y south of X?") and flagging cases where the model produces contradictory reasoning across the pair. This rests on a determinism assumption that LLMs do not satisfy: even meaning-preserving changes to a prompt --- different wordings, different templates, different orderings --- can produce strikingly different outputs and trace through different internal computations<d-cite key="sclar2024quantifying, mizrahi-etal-2024-state"/>. The two CoTs are genuinely contradictory, but, as the authors themselves acknowledge, both could still faithfully describe what the model did on each respective forward pass.

<br />

#### Faithfulness vs. Importance
Importance is whether a CoT step is causally important to the model's answer<d-cite key="bogdan2025thoughtanchorsllmreasoning"/>. The two properties may sound related, but they are independent, and they are nonetheless often conflated<d-cite key="turpin2023language, paul-etal-2024-making, chen2025reasoningmodelsdontsay, bao-etal-2025-likely, zaman2025chainofthoughtreallyexplainabilitychainofthought, boppana2026reasoningtheaterdisentanglingmodel"/>.
As Figure&nbsp;<a href="#faith_v_imp">3</a> illustrates, a step can be causally important internally while being verbalized unfaithfully, and conversely, a step can faithfully describe a computation that occurred without that computation being causally important to the answer.


<figure id="faith_v_imp" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/faith_v_imp.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/faith_v_imp.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 3</strong>: Conflating importance and faithfulness happens when we mistake the causal importance of a CoT step for how faithfully it describes an internal process. The diamond marks a step that was causally important to the model's answer. The left rectangle highlights an unfaithful step: a causally important calculation occurs, but is verbalized unfaithfully. The right rectangle highlights a faithful step: the computation isn't causally important to the answer, but the verbalization does faithfully describe a process the model performed.
  </figcaption>
</figure>

<br />

This conflation is built into many widely used metrics. A common family of methods evaluates faithfulness by perturbing individual CoT steps and checking whether the model's output changes<d-cite key="lanham2023measuringfaithfulnesschainofthoughtreasoning"/>. A related move shows that models' answers are often unaffected by progressive truncation of their CoTs, and concludes that the model is engaged in *unfaithful post-hoc reasoning* --- having reached its conclusion early and merely pretending to reason toward it. But the same observation has at least two innocent explanations: the model may only need a handful of forward passes to settle on its answer and then spend the remaining tokens accurately verbalizing that computation, or it may explore alternative directions and confirm that its initial approach was correct. In each case the truncated steps are not causally necessary, yet the full CoT can still faithfully describe a process the model actually performed.

### Where this leaves us
TODO...

<!-- Faithfulness is the property we care about when we want CoTs to underwrite oversight of models. Plausibility and importance are easier to measure, but neither is what the definition asks for, and neither is what a safety case can be built on. A method that confuses any of these properties will declare faithful CoTs unfaithful, declare unfaithful CoTs faithful, or some unhappy mixture of both --- exactly the failure modes that make a metric worse than no metric at all.

None of this means faithfulness is unmeasurable, only that the field has yet to measure it. Getting there will require evaluations grounded in what the definition actually says: methods that compare a CoT against the computation the model actually performed, rather than against how convincing it looks or how much its individual steps matter to the answer. Until then, claims that a given CoT is or isn't faithful should be read with a heavy dose of skepticism --- often, what is being reported is something else entirely. -->

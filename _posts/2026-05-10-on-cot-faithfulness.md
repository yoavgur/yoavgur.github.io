---
layout: distill
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
Making LLMs use chains of thought (CoTs) to solve complex problems has proven to be remarkably effective, both by prompting them to think step by step<d-cite key="wei2022chain"/> and by training them to generate extended internal deliberations<d-cite key="kojima2022large, o1, Guo_2025"/>. Viewing these reasoning traces as a lens into the true internal reasoning of the model, these traces were seized upon as a unique opportunity for AI safety, supposedly enabling direct and transparent oversight of these models<d-cite key="korbak2025chainthoughtmonitorabilitynew, openai2026monitoring"/>. However, many works have since shown that these traces aren't necessarily *faithful* to the model's unerlying computations<d-cite key="turpin2023language, chen2025reasoningmodelsdontsay, arcuschin2026biasesblindspotdetecting"/> --- CoTs can misrepresent the factors influencing their decisions, and serve as pos-hoc rationalizations for predetermined answers.

Since then, there have been many attempts at methods for evaluating the faithfulness of CoTs, and several meta-evaluations of those methods (TODO: cite). However, **we argue that current evaluations of CoT faithfulness are conceptually misaligned with how faithfulness is defined, and therefore systematically mis-measure it**. This misalignment is dangerous, since it can lead to both false assurances about an LM's trustworthiness, as well as unwarranted suspicion. We make this argument by first examining definitions of faithfulness in the literature, and evaluating their operationalization in different papers, showing that the latter often disagree with the former, conflate faithfulness with other properties of CoTs, or lack a theoretical grounding for their arguments.

We consider this a call to action for researchers working in the field of CoT faithfulness. TODO: final sentence.
<!-- Understanding the internal reasoning of LLMs is crucial for relying on them in high-stakes settings, and measuring  -->


### Defining Faithfulness
Following Jacovi and Goldberg's definition<d-cite key="jacovi-goldberg-2020-towards" />, faithfulness is overwhelmingly defined in the literature as **the correspondence between a CoT (or explanation) and the model's true internal reasoning process**. In other words, a faithful CoT should accurately describe the internal reasoning process performed by the model. Some works augment this definition with additional requirement of a causal relationship between a CoT and the model's prediction<d-cite key="siegel-etal-2024-probabilities,bao-etal-2025-likely"/>, or legibility to humans <d-cite key="chen2025reasoningmodelsdontsay"/>. Although the proposed definition is commonly criticized as unactionable, we adopt it seeing as it sets an amibitious north star which faithfulness evaluations can aspire to meet, as well as being the general core consensus in the literature.

### Evaluating Faithfulness Incorrectly
Having defined CoT faithfulness in clear terms, we now review the literature for how this definition is applied in practice. We find that papers commonly conflate between faithfulness and other properties such as plausibility and importance, or make claims without sufficient theoretical grounding, and that are misaligned with how faithfulness is defined.


#### Faithfulness vs. Plausibility
Plausibility is defined as whether a CoT describes a reasonable and convincing process by which the model *could have* reached its answer<d-cite key="jacovi-goldberg-2020-towards"/>. Previous works have already argued for the distinction between plausibility and faithfulness<d-cite key="jacovi-goldberg-2020-towards,agarwal2024faithfulnessvsplausibilityunreliability"/>, however their conflation remains pervasive in the literature<d-cite key="Lundberg2017AUA, poerner-etal-2018-evaluating, wu-mooney-2019-faithful, zaman-srivastava-2025-causal, shen2026faithcotbench, cot-may-be-highly-informative-despite-unfaithfulness, chang2026rauditblindauditingprotocol, arcuschin2025chainofthought, mittal2026c2faithbenchmarkingllmjudges"/>.

The core distinction between the two properties is that plausibility is concerned with whether the CoT describes a coherent reasoning process that makes sense to a human reader. Thus, these types of CoTs are usually evaluated using human annotators who measure whether a CoT makes sense to them. This however belies the fact that LLMs can get to a correct answer through ways that a human wouldn't expect. Thus, as shown in Figure&nbsp;<a href="#faith_v_plaus">1</a>, conflating faithfulness and importance can lead us to mistake a faithful account of implausible reasoning as unfaithful, as well as an unfaithful account that looks plausible as faithful.

<figure id="faith_v_plaus" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/faith_v_plaus.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/faith_v_plaus.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 1</strong>: Conflating plausibility and faithfulness occurs when we mistake how we think the model ought to have solved a task, and how it must have solve a task. Here, we assume the only way a model could've solved a task is by going through steps A→B→C. In reality, the model could've solved it by doing A→Q→C. Therefore, if the CoT faithfully represents this, it is wrongly marked as unfaithful (left), while if it misrepresents this, it is wrongly marked as faithful (right).
  </figcaption>
</figure>

<br />

Some recent works illustrate this conflation in practice. For example, FaithCoT-Bench<d-cite key="shen2026faithcotbench"/> labels CoTs as unfaithful when annotators judge the reasoning path to be implausible or wrong. In an example appearing in their appendix, the model is asked "*What did 'coma' originally stand for?*". The model then answers correctly, basing its response on its memory that coma comes from the Greek κῶμα. The annotators judged this reasoning to be unfaithful without proof, citing their judgement of the argument's logical structure as opposed to whether the model did or did not perform the steps it describes performing.
Another example comes from Arcuschin et al.<d-cite key="arcuschin2025chainofthought"/>, who detect unfaithfulness by generating CoTs for pairs of logically equivalent questions ("Is X south of Y?" vs. "Is Y south of X?") and flagging cases where the model produces contradictory reasoning across the pair. This carries a hidden determinism assumption that LLMs do not satisfy. Different phrasings have been shown activate different computations, surface different associations, and push the trajectory through different parts of the residual stream (TODO: cite). Therefore, as they themselves admit, while these CoTs are indeed contradictory, they could still both faithfully represent the model's reasoning.

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

<br />

#### Faithfulness vs. Importance
Importance is defined as whether a CoT step is causally important to the model's answer<d-cite key="bogdan2025thoughtanchorsllmreasoning"/>. But while importance and faithfulness may seem related, they are independent properties, despite often being conflated<d-cite key="turpin2023language, paul-etal-2024-making, chen2025reasoningmodelsdontsay, bao-etal-2025-likely, zaman2025chainofthoughtreallyexplainabilitychainofthought, boppana2026reasoningtheaterdisentanglingmodel"/>.
As shown in Figure&nbsp;<a href="#faith_v_imp">3</a>, a step could be causally important internally, while being verbalized unfaithfully. Conversely, it could be faithfully describing a step that already occurred, thereby making it not causally important to the answer, but still faithful. 


<figure id="faith_v_imp" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/faith_v_imp.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/faith_v_imp.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 3</strong>: Conflating importance and faithfulness occurs when we mistake the importance of a given CoT step with how faithfully it describes an internal process that occurred. Here the diamond represents a important step that affected the model's answer. Thus, the left rectangle highlights an unfaithful step, where a causally important calculation occurs, but is verbalized unfaithfully. The right rectangle highlights a faithful step, where the calculation itself isn't causally important, but the verbalization does faithfully describe a process that occurred.
  </figcaption>
</figure>

<br />

As an example of this conflation, many metrics that attempt to evaluate the faithfulness of CoTs do so by perturbing individual CoT steps and seeing whether those have an effect on the model's output <d-cite key="lanham2023measuringfaithfulnesschainofthoughtreasoning"/>. Other works conflate faithfulness with importance by showing that model's answers are frequently unaffected by the progressive truncation of their CoTs, claiming this proves that the model is exhibiting *unfaithful post-hoc reasoning*, where the model reaches a conclusion early on but pretends to reason towards it. This phenomena however could also be explained by the model only needing a few forward passes to reach its conclusion, while verbalizing this process accurately over the course of more tokens, or even evaluating different directions and concluding that its initial approach was correct.

---
layout: distill
title: "Mixing Mechanisms: How Language Models Retrieve Bound Entities In-Context"
description: To reason, LMs must bind together entities in-context. How they do this is more complicated than was first thought.
tags: NLP Binding Interpretability AI ML
giscus_comments: false
date: 2025-09-29
featured: false
pretty_table: false
citation: true

authors:
  - name: Yoav Gur-Arieh
    url: "https://yoav.ml"
    affiliations:
      name: Tel Aviv University

  - name: Mor Geva
    url: "https://mega002.github.io/"
    affiliations:
      name: Tel Aviv University

  - name: Atticus Geiger
    url: "http://prair.group/"
    affiliations:
      name: Pr(Ai)²R


bibliography: 2025-09-29-mixing-mechs.bib
image: https://yoav.ml/assets/img/binding.png
og_image: https://yoav.ml/assets/img/binding.png
twitter_image: https://yoav.ml/assets/img/binding.png
twitter_card: summary_large_image
thumbnail: assets/img/binding.png

# Optionally, you can add a table of contents to your post.
# NOTES:
#   - make sure that TOC names match the actual section names
#     for hyperlinks within the post to work correctly.
#   - we may want to automate TOC generation in the future using
#     jekyll-toc plugin (https://github.com/toshimaru/jekyll-toc).

---
<d-contents>
  <nav class="l-text figcaption">
    <h3>Contents</h3>
    <div><a href="#introduction">Introduction</a></div>
    <div><a href="#three-mechanisms">Three Mechanisms For Binding and Retrieval</a></div>
    <div><a href="#results-and-analyses">Results and Analyses</a></div>
    <div><a href="#causal-model">A Simple Model for Simulating Entity Retrieval In-Context</a></div>
    <div><a href="#free-form">Introducing Free Form Text Into the Task</a></div>
    <div><a href="#conclusion">Conclusion</a></div>
    <div><a href="#interactive">Interactive Figure</a></div>
  </nav>
</d-contents>

<strong>TL;DR</strong>: Entity binding in LMs is crucial for reasoning in LMs. Prior work established a <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism underlying binding, but we find that it breaks down in complex settings. We uncover two additional mechanisms—<mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark>—that drive model behavior.

<a href="#interactive">Jump to the interactive demo below</a>, or read the full paper <a href="https://arxiv.org/abs/2510.06182">here</a>.

<figure style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 1200px; margin-left: auto; margin-right: auto;">
  <div 
    style="width: 100%; max-width: min(150%, 1200px); margin-left: auto; margin-right: auto;" 
    data-binding-demo 
    data-mode="animated" 
    data-initial-n="10" 
    data-initial-ip="4" 
    data-initial-il="4" 
    data-initial-ir="4" 
    data-initial-target="2" 
    data-show-title="false" 
    data-show-sentence="true"
    data-animation-sequence='[{"iL":4,"delay":500},{"iR":4,"delay":1500}, {"iL":10,"delay":500},       {"iR":8,"delay":1500}]'>
  </div>

  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem;">
    <strong>Figure 1</strong>: A list of entities that need to be bound together is provided to the model. We see the model's (real collected) token probabilities, first when setting the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> (pos) / <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> (lex) / <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> (ref) mechanisms to point to the same entity, and then when pointing them at different entities. Interactive version <a href="#interactive">here</a>.
  </figcaption>
</figure>

<!-- <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> -->
<!-- <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> -->
<!-- <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> -->


<!-- This is a blog post version of the [paper](https://arxiv.org/abs/2501.08319) we wrote on the same topic. -->

<h3 id="introduction" style="scroll-margin-top: 80px;">Introduction</h3>
Language models (LMs) are known for their ability to perform in-context reasoning, and fundamental to this capability is the task of connecting related entities in a text---known as *binding*---to construct a representation of context that can be queried for next token prediction. For example, to represent the text *Pete loves jam and Ann loves pie*, an LM will bind *Pete* to *jam* and *Ann* to *pie*. This enables the LM to answer questions like *Who loves pie?* by querying the bound entities to retrieve the answer (*Ann*). The prevailing view is that LMs retrieve bound entities using a <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism<d-cite key="dai-etal-2024-representational"></d-cite><d-cite key="prakash2024finetuning"></d-cite><d-cite key="prakash2025languagemodelsuselookbacks"></d-cite>, where the query entity (*pie*) is used to determine the in-context position of *Ann loves pie*—in this case, the second clause after *Pete loves jam*—which is dereferenced to retrieve the answer *Ann*.

However, we show that the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism becomes unreliable for middle positions in long lists of entity groups, echoing the *lost-in-the-middle* effect<d-cite key="liu-etal-2024-lost"></d-cite>. To compensate for this, LMs supplement the positional mechanism with a <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> mechanism, where the query entity (*pie*) is used to retrieve its bound counterpart (*Ann*), and a <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanism, where the queried entity (*Ann*) is retrieved with a direct pointer that was previously retrieved via the query entity (*pie*).
See Figure&nbsp;<a href="#figure-2">2</a> for illustration.

In this post we describe exactly how LMs use the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms for entity binding and retrieval, which we validate across (1) nine models from the Llama, Gemma and Qwen model families (2-72B parameters), and (2) ten different binding tasks. These mechanisms and their interactions remain consistent across all of these, establishing a general account of how LMs bind and retrieve entities.

<figure id="figure-2" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/mechs_fig1.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/mechs_fig1.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 2</strong>: An illustration of the three mechanisms for retrieving bound entities in-context and how we isolate them. We find that as models process inputs with groups of entities: (A) binding information of three types—<mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark>, <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark>—is encoded in the entity tokens of each group, (B) this binding information is jointly used to retrieve entities in-context, and (C) it is possible to separate the three binding signals with counterfactual patching. 
  </figcaption>
</figure>


<h3 id="three-mechanisms">Three Mechanisms For Binding and Retrieval</h3>
The prevailing view is that entities are bound and retrieved with a <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism <d-cite key="dai-etal-2024-representational"></d-cite><d-cite key="prakash2024finetuning"></d-cite><d-cite key="prakash2025languagemodelsuselookbacks"></d-cite>.
However, since this mechanism fails to explain model behavior in more complex settings, we propose and test two alternatives for how LMs might implement binding. To do this, we design datasets with pairs of original and counterfactual inputs, such that each of the three proposed mechanisms makes a distinct prediction under an interchange intervention with the pair. This is illustrated in Figure&nbsp;<a href="#figure-2">2</a>.
Our three hopythesized mechanisms are:
- <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>Positional</b></mark> - given a query entity (What does **Tim** love?), the model extracts the index of the entity group to which it belongs (**4**), and retrieves the queried entity (**tea**) from it. Thus, patching this binding information from the counterfactual (where the queried entity group index is **2**) to the original would make the model respond with the answer from entity group number 2 (**jam**).
- <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>Lexical</b></mark> - where instead of using the position of the query entity, the model uses its lexical content to retrieve the bound entity from the group containing the query entity. This is achieved by copying the lexical contents of the **Tim** token into the **tea** token position (illustrated in Figure&nbsp;<a href="#figure-2">2</a> with a key), which can then trigger the attention of the query token (**Tim**), enabling retrieval of the bound entity (**tea**). Thus, patching in this binding information from the counterfactual (where the query entity is **Ann**) to the original would make the model respond with the answer from the entity group with Ann (**ale**).
- <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>Reflexive</b></mark> - where each entity in an entity group also encodes a pointer that points directly to itself, which can then by copied to other entities in its entity group and dereferenced in order to retrieve its originating entity. This mechanism is needed because the lexical mechanism, as described previously, requires information being copied between entity tokens to bind them together. However, if we query the first token in an entity group (i.e. **Who loves tea?**), then this mechanism would be useless, since the causal attention mask forbids the lexical contents of **tea** being copied *backward* to **Tim**. Thus, reflexive binding information pointing to **Tim** and originating from it, is copied *forward* to the **tea** token position, which can then be retrieved using the query entity (Who loves **tea**?), and used to retrieve **Tim**. Thus, in Figure&nbsp;<a href="#figure-2">2</a>, patching in this binding information from the counterfactual (where the answer entity is **pie**) to the original would make the model respond with **pie**. Note that this behavior is identical to patching in the answer itself from the counterfactual to the original, but we disambiguate these two mechanisms in multiple subsequent experiments involving more elaborate datasets as well as attention knockouts<d-cite key="geva-etal-2023-dissecting"></d-cite>, confirming the existence of this mechanism. Note also that this binding information only points to the token from which it originated (using its lexical content). Therefore, patching this binding information to a prompt where the **pie** entity doesn't exist would lead to the model not being able to use this mechanism for retrieval.


<figure id="figure-3" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/u_plot_gemma-2-2b.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/u_plot_gemma-2-2b.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 3</strong>: Results from interchange interventions on gemma-2-2b-it over a counterfactual dataset with three entities per group. Outputs predicted by the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms are shown in dark blue, green and orange.
    Here $t_{entity}$ is the target entity, i.e. the entity being queried in the counterfactual example. 
    <b>Left</b>: Distribution of effects for three representative entity group indices (first, middle, and last) with $t_{\text{entity}}=3$. At layers 16–18, the last token position carries binding information used for retrieval. <b>Right</b>: Distribution of effects for all indices at layer 18 for $t_{\text{entity}} \in \{1,2,3\}$, i.e., the question can be about any of the three entities in each clause. A U-shaped curve emerges: first and last indices rely more on the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism, while middle indices rely more on the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms. In the full paper, we replicate these exact results across all nine models and ten binding tasks.
  </figcaption>
</figure>


<h3 id="results-and-analyses">Results and Analyses</h3>
In Figure&nbsp;<a href="#figure-3">3</a>, we see the results of our interchange interventions for gemma-2-2b-it (replicated for all other models in the paper). We also collect the mean output probabilities for each possible answer entity post patching, highlighting the entities pointed to by each of the mechanisms, to understand the interplay between the three mechanisms.

#### Aggregating Binding Information
We see in Figure&nbsp;<a href="#figure-3">3</a> that in layers 0-15, no binding information exists in the last token position, since patching it doesn't have any effect on model behavior. In layers 19-25, the model has already retrieved the bound entity, since patching the last token position leads to the model responding with the answer from the counterfactual example. However, in layers 16-18 we see that the model has aggregated the binding information in the last token position, since patching it from the counterfactual to the original leads the model to respond with entities corresponding to the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms.


#### The Positional Mechanism is Weak and Diffuse in Middle Positions
Figure&nbsp;<a href="#figure-3">3</a> shows that the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism controls model behavior only when querying the first few and last entity groups. In middle entity groups, however, its effect becomes minimal, only accounting for ~20% of model behavior.

In Figure&nbsp;<a href="#figure-4">4</a> we see the mean probabilities for each answer entity (in order of their entity group index, i.e. in order of appearance in context), fixing the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms to point to the first entity, and sliding the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism across all values. We see that the mechanism induces a strong concentrated distribution around the entity pointed to by the positional mechanism in the beginning and end, but that in middle entity groups its distribution becomes weak and diffuse. This indicates that the model struggles to use positional information to bind together entities in middle entity groups, making it unreliable as the sole mechanism for binding.

<figure id="figure-4">
<div data-binding-demo 
     data-mode="animated" 
     data-initial-n="10" 
     data-initial-ip="1" 
     data-initial-il="1" 
     data-initial-ir="1" 
     data-initial-target="1" 
     data-show-title="false" 
     data-show-sentence="false"
     data-animation-sequence='[{"iP":1,"delay":1500},{"iP":2,"delay":1500},{"iP":3,"delay":1500},{"iP":4,"delay":1500},{"iP":5,"delay":1500},{"iP":6,"delay":1500},{"iP":7,"delay":1500},{"iP":8,"delay":1500},{"iP":9,"delay":1500},{"iP":10,"delay":1500}]'>
</div>
<figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem;">
  <strong>Figure 4</strong>: Mean probabilities for all answer entities, fixing the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms to point to the first entity, and sliding the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism across all values. We see that in early and late entity groups the positional mechanism induces a strong concentrated distribution, while for middle ones it becomes weak and diffuse, rendering it less robust.
</figcaption>
</figure>

<br />

#### Interplay Between The Mechanisms
We see in Figure&nbsp;<a href="#figure-5">5</a> that, contrary to the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism, the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms induce one-hot distributions at their target entities. The distributions induced by the three mechanisms then interact with each other in shaping the model's behavior, both boosting and suppressing each other. We see for example that when the lexical / reflexive mechanisms point at entities near the positional one, their probabilities increase dramatically, while simultaneously suppressing that of the entity pointed to by the positional mechanism.

<figure id="figure-5">
<div data-binding-demo 
     data-mode="animated" 
     data-initial-n="8" 
     data-initial-ip="4" 
     data-initial-il="1" 
     data-initial-ir="8" 
     data-initial-target="1" 
     data-show-title="false" 
     data-show-sentence="false"
     data-animation-sequence='[{"iL":1,"delay":1000},{"iL":2,"delay":1000},{"iL":3,"delay":1000},{"iL":4,"delay":1000},{"iL":5,"delay":1000},{"iL":6,"delay":1000},{"iL":7,"delay":1000},{"iL":8,"delay":1000}, {"iR":1,"delay":1000},{"iR":2,"delay":1000},{"iR":3,"delay":1000},{"iR":4,"delay":1000},{"iR":5,"delay":1000},{"iR":6,"delay":1000},{"iR":7,"delay":1000},{"iR":8,"delay":1000}]'>
</div>

<figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem;">
  <strong>Figure 5</strong>: Interaction between the different mechanisms. We fix the entity pointed to by the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism, and slide the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms. We see that the latter two induce one-hot distributions, and interact with each other and the positional mechanism in additive and suppressive ways.
</figcaption>
</figure>

<!-- We see in Figure&nbsp;<a href="#figure-5">5</a> that the model 


<figure id="figure-5">
<div data-binding-demo 
     data-mode="animated" 
     data-initial-n="3" 
     data-initial-ip="2" 
     data-initial-il="1" 
     data-initial-ir="1" 
     data-initial-target="2" 
     data-show-title="false" 
     data-show-sentence="false"
     data-animation-sequence='[{"n":3, "iP":2,"delay":2000}, {"n":5, "iP":3,"delay":2000}, {"n":7, "iP":4,"delay":2000}, {"n":9, "iP":5,"delay":2000}, {"n":11, "iP":6,"delay":2000}]'>
</div>

<figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem;">
  Figure 5: The positional signal is stronger when there are few entities, and overpowers the other mechanisms.
</figcaption> -->

<h3 id="causal-model">A Simple Model for Simulating Entity Retrieval In-Context</h3>
To formalize out observations about the dynamics between the three mechanisms and the position of the queried entity, we develop a high-level causal model<d-cite key="geiger2021causal"></d-cite> that approximates LM logits for next token prediction. We formalize this as a position-weighted mixture of terms for the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms. In accordance with the results in Figure&nbsp;<a href="#figure-5">5</a>, we model the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms as one-hot distributions that up-weight only entities pointed to by those mechanisms, while the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism is modeled as a gaussian distribution scaled by a single weight, with a standard deviation that is a quadratic function of the positional index. Formally:

<div style="overflow-x:auto;">
$$Y_i := \underbrace{w_{\mathrm{pos}} \cdot \mathcal{N}\left(i \mid i_P, \sigma(i_P)^2\right)}_{\text{positional mechanism}} 
+ \underbrace{w_{\mathrm{lex}}\!\left[i_L\right]\cdot \mathbf{1}\!\left\{i = i_L\right\}}_{\text{lexical mechanism}} 
+ \underbrace{w_{\mathrm{ref}}\!\left[i_R\right]\cdot \mathbf{1}\{i=i_R\}}_{\text{reflexive mechanism}}$$
</div>

Where $i_{P/L/R}$ are the entity group indices pointed by the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms respectively, and $\sigma(i_P) = \alpha (\frac{i_P}{n})^2 + \beta \frac{i_P}{n} + \gamma$. We learn $w_{pos},w_{lex},w_{ref},\alpha, \beta, \gamma$ from data.

To train and evaluate our model, we collect the logit distributions per index combination, and average them into mean probability distributions by first applying a softmax over the entity group indices, and then take taking the mean. We calculate the loss using Jensen-Shannon divergence (chosen for its symmetry), and measure performance using Jensen-Shannon similarity (JSS), its complement, which ranges from 0 to 1. We also compare our model to the prevailing view (one-hot distribution at $i_P$), as well as various ablations of our model. Finally, we compare our model to an oracle variant, an upper bound where we replace the learned gaussian with the actual collected probabilities.


<figure id="table-1" style="width:100%;">
  <div style="overflow-x:auto;">
  <table style="width:100%; border-collapse:collapse;">
    <thead>
      <tr>
        <th style="text-align:left;"><strong>Model</strong></th>
        <th style="text-align:center;"><strong>JSS ↑ $(t_e=1)$</strong></th>
        <th style="text-align:center;"><strong>JSS ↑ $(t_e=2)$</strong></th>
        <th style="text-align:center;"><strong>JSS ↑ $(t_e=3)$</strong></th>
      </tr>
    </thead>
    <tbody>
      <tr><td colspan="4" style="text-align:center;"><em>Comparing against the prevailing view</em></td></tr>
      <tr>
        <td>$\mathcal{M}(L_{\text{one-hot}}, R_{\text{one-hot}}, P_{\text{Gauss}})$</td>
        <td style="text-align:center;"><strong>0.95</strong></td>
        <td style="text-align:center;"><strong>0.96</strong></td>
        <td style="text-align:center;"><strong>0.94</strong></td>
      </tr>
      <tr>
        <td>$\mathcal{P}_{\text{one-hot}}$ (prevailing view)</td>
        <td style="text-align:center;">0.42</td>
        <td style="text-align:center;">0.46</td>
        <td style="text-align:center;">0.45</td>
      </tr>

      <tr><td colspan="4" style="text-align:center;"><em>Modifying the positional mechanism</em></td></tr>
      <tr>
        <td>$\mathcal{M}$ w/ $P_{\text{oracle}}$</td>
        <td style="text-align:center;">0.96</td>
        <td style="text-align:center;">0.98</td>
        <td style="text-align:center;">0.96</td>
      </tr>
      <tr>
        <td>$\mathcal{M}$ w/ $P_{\text{one-hot}}$</td>
        <td style="text-align:center;">0.86</td>
        <td style="text-align:center;">0.85</td>
        <td style="text-align:center;">0.85</td>
      </tr>

      <tr><td colspan="4" style="text-align:center;"><em>Ablating the three mechanisms</em></td></tr>
      <tr>
        <td>$\mathcal{M} \setminus \{P_{\text{Gauss}}\}$</td>
        <td style="text-align:center;">0.67</td>
        <td style="text-align:center;">0.68</td>
        <td style="text-align:center;">0.67</td>
      </tr>
      <tr>
        <td>$\mathcal{M} \setminus \{L_{\text{one-hot}}\}$</td>
        <td style="text-align:center;">0.94</td>
        <td style="text-align:center;">0.91</td>
        <td style="text-align:center;">0.75</td>
      </tr>
      <tr>
        <td>$\mathcal{M} \setminus \{R_{\text{one-hot}}\}$</td>
        <td style="text-align:center;">0.69</td>
        <td style="text-align:center;">0.87</td>
        <td style="text-align:center;">0.92</td>
      </tr>
      <tr>
        <td>$\mathcal{M} \setminus \{R_{\text{one-hot}}, L_{\text{one-hot}}\}$</td>
        <td style="text-align:center;">0.69</td>
        <td style="text-align:center;">0.84</td>
        <td style="text-align:center;">0.74</td>
      </tr>
      <tr>
        <td>$\mathcal{M} \setminus \{P_{\text{Gauss}}, R_{\text{one-hot}}\}$</td>
        <td style="text-align:center;">0.12</td>
        <td style="text-align:center;">0.27</td>
        <td style="text-align:center;">0.48</td>
      </tr>
      <tr>
        <td>$\mathcal{M} \setminus \{P_{\text{Gauss}}, L_{\text{one-hot}}\}$</td>
        <td style="text-align:center;">0.55</td>
        <td style="text-align:center;">0.41</td>
        <td style="text-align:center;">0.20</td>
      </tr>
      <tr>
        <td>Uniform</td>
        <td style="text-align:center;">0.44</td>
        <td style="text-align:center;">0.57</td>
        <td style="text-align:center;">0.49</td>
      </tr>
    </tbody>
  </table>
  </div>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem;">
    <strong>Table 1:</strong> Jensen-Shannon similarity (JSS) results for training our full model $\mathcal{M}$, in addition to variants, baselines and ablations. We show results for $t_e \in [3]$, i.e. when querying the first, second and third entities in an entity group, respectively.
  </figcaption>
</figure>

<br />

We see in Table&nbsp;<a href="#table-1">1</a> that our model achieves near perfect results (0.95), only slightly below the oracle variant (0.97). We also see that the model representing the prevailing view achieves much worse results (0.44), well below even a uniform distribution (0.5). Finally, we can see when each component of our model is important for modeling the LM's behavior: when querying the first entity in a group, the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> mechanism is not crucial for modeling the LM's behavior, while when querying the last entity the <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> one isn't, in line with our hypothesis.


<h3 id="free-form">Introducing Free Form Text Into the Task</h3>
To test our model's generalization to more realistic inputs, we modify our binding tasks such that they include filler sentences between each entity group. To this end, we create 1,000 filler sentences that are "entity-less", meaning they do not contain sequences that signal the need to track or bind entities, e.g. "Ann loves ale, *this is a known fact*, Joe loves jam, *this logic is easy to follow*...". This enables us to evaluate entity binding in a more naturalistic setting, containing much more noise and longer sequences. We evaluate different levels of padding by interleaving the entity groups with an increasing number of filler sentences, for a maximum of 500 tokens between each entity group.

<figure id="figure-6" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/filler_trends_stacked.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/filler_trends_stacked.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 6</strong>: Distribution of effects as padding is increased, showing the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism strengthens at the expense of the <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> mechanism.
  </figcaption>
</figure>

<br>

The results, shown in Figure&nbsp;<a href="#figure-6">6</a> and&nbsp;<a href="#figure-7">7</a>, show that our model at first remains remarkably consistent in more naturalistic settings, across even a ten-fold increase in the number of tokens. However, as the amount of filler tokens increases, we see that the magnitude of the mechanisms' effects changes. The <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> mechanism declines in its effect, while the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> and mixed effects slightly increase. We can also see that the mixed effect remains distributed around the positional index, but that it slowly becomes more diffuse. Thus, when padding with 10,000 tokens, we get that other than the first entity group, the positional information becomes nearly non-existent for the first half of entity tokens, while remaining stronger in the latter half. This suggests that a weakening lexical mechanism relative to an increasingly noisy positional mechanism might be a mechanistic explanation of the "lost-in-the-middle" effect<d-cite key="liu-etal-2024-lost"></d-cite>.

<figure id="figure-7" style="display: flex; flex-direction: column; align-items: center; border: none; margin: 0; padding: 0;">
<a href="{{ '/assets/img/confusion_matrix_padding.png' | relative_url }}" target="_blank" style="display:block; max-width:100%;text-decoration:none!important;border-bottom:0!important;box-shadow:none!important; background-image:none!important;">
  <img src="{{ '/assets/img/confusion_matrix_padding.png' | relative_url }}"
       alt="Mechanisms Figure 1"
       style="display:block; max-width:100%; height:auto; cursor:zoom-in; border:0;">
</a>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem; border: none;">
    <strong>Figure 7</strong>: Confusion matrix between the model's predicted index and the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> index patched in from the counterfactual. This gets increasingly fuzzy for early tokens as padding is increased.
  </figcaption>
</figure>

<h3 id="conclusion">Conclusion</h3>
In our work, we challenge the prevailing view that LMs retrieve bound entities purely with a <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism. We find that while the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> mechanism is effective for entities introduced at the beginning or end of context, it becomes diffuse and unreliable in the middle. We show that in practice, LMs rely on a mixture of three mechanisms: <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark>, and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark>. The lexical and reflexive mechanisms provide sharper signals that enable the model to correctly bind and retrieve entities throughout. We validate our findings across 9 models ranging from 2B to 72B parameters, and 10 binding tasks, establishing a general account of how LMs retrieve bound entities.

---
<h3 id="interactive" style="scroll-margin-top: 80px;"> Interactive Figure </h3>

Here we provide an interactive figure, showing the mean output probabilities (gemma-2-2b-it) over the possible answer entities contingent on which entities are pointed to by the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark>, <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> and <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms (pos, lex and ref respectively). You can control the number of entity groups in the context (n), as well as which entity in a group is queried (target). See the <a href="#introduction">full blog post</a> or our <a href="https://arxiv.org/abs/2510.06182">paper</a> to understand more about how LMs perform binding and retrieval.


<figure>
<div data-binding-demo data-mode="interactive" data-initial-n="10" data-initial-ip="4" data-initial-il="10" data-initial-ir="8" data-initial-target="2" data-show-title="true" data-show-sentence="true"></div>
  <figcaption style="font-size: 0.9em; color: #6c757d; margin-top: 0.5rem;">
    Figure 7: Interactive version where you can set how many entities exist, and the entities pointed to by the <mark style="background:rgb(214, 232, 252); color: #2e73b3ff; padding: 0.1em 0.3em; border-radius: 0.2em;"><b>positional</b></mark> / <mark style="background:rgb(203, 232, 221); color:rgb(26, 147, 98); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>lexical</b></mark> / <mark style="background:rgb(255, 231, 203); color:rgb(252, 156, 46); padding: 0.1em 0.3em; border-radius: 0.2em;"><b>reflexive</b></mark> mechanisms.
  </figcaption>
</figure>


---

Please cite as:
```bibtex
@misc{gurarieh2025mixing,
    title={Mixing Mechanisms: How Language Models Retrieve Bound Entities In-Context},
    author={Yoav Gur-Arieh and Mor Geva and Atticus Geiger},
    year={2025},
    eprint={2510.06182},
    archivePrefix={arXiv},
    primaryClass={cs.CL}
}
```


<link rel="stylesheet" href="{{ '/assets/css/binding-demo/index-BEOe_g9O.css' | relative_url }}">
<script type="module" defer src="{{ '/assets/js/binding-demo/index-B_g5bwzp.js' | relative_url }}"></script>

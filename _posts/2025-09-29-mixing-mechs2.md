---
layout: distill
title: How Language Models Retrieve Bound Entities In-Context
description: To reason, LMs must bind together entities in-context. How they do this is more complicated than was first thought.
tags: NLP Binding Interpretability AI ML
giscus_comments: false
date: 2025-09-29
featured: true
pretty_table: false
citation: true

authors:
  - name: Yoav Gur Arieh
    url: "https://yoav.ml"
    affiliations:
      name: Tel Aviv University

bibliography: 2025-01-18-enhancing-interp.bib

thumbnail: assets/img/enhancing.gif

# Optionally, you can add a table of contents to your post.
# NOTES:
#   - make sure that TOC names match the actual section names
#     for hyperlinks within the post to work correctly.
#   - we may want to automate TOC generation in the future using
#     jekyll-toc plugin (https://github.com/toshimaru/jekyll-toc).

---

This is a blog post version of the [paper](https://arxiv.org/abs/2501.08319) we wrote on the same topic.

### Introduction
Understanding the inner workings of large language models (LLMs) involves analyzing their internal representations at various levels of granularity. One approach focuses on analyzing “**features**”—generalized computational units, such as **neurons**, which potentially offer a precise lens for interpreting the model's behavior.





### Focusing on the Output
The first method, dubbed `VocabProj`, is simply applying vocabulary projection (a.k.a. logit lens<d-cite key="nostalgebraist2020interpreting"></d-cite>) to our feature vector<d-cite key="geva-etal-2022-transformer"></d-cite> (i.e. the relevant row vector in the MLP out matrix, or the SAE decode matrix). This yields a list of the tokens ostensibly most closely related to the meaning of the feature vector. We can then pass this list to an explainer model (e.g. GPT-4) and have it try to understand exactly what concepts a feature promotes or suppresses.

The second method, dubbed `TokenChange`, takes a more causal approach. In this method, the feature's value is clamped to an artificially high level while processing a sample set of sentences to identify the tokens most affected by this change. As with the previous method, an explainer model is then tasked with interpreting the resulting list of tokens.

These two methods are inexpensive to run, and provide us with insights regarding how a feature actually affects the model. Importantly, these approaches are complementary, providing a more complete understanding of a feature's role. For instance, consider the MLP SAE feature `19/5635` from Gemma-2 2B. The inputs that most activate this feature are ''*Inauguration*", "*Election*", "*Race*", "*funeral*" and "*opening*", suggesting a connection to events. Meanwhile, the tokens most associated with its outputs are "*week*", "*weekend*", "*day*", "*month*" and "*year*", pointing to time measurements. Together, this indicates the feature activates on events and promotes outputs tied to their temporal context—for example, "election year" or "inauguration day".





### Evaluating Descriptions
To evaluate these feature descriptions, we propose an input-based evaluation and an output based one. In the input-based evaluation, we provide an LLM with the feature's description, and ask it to generate sentences that might activate the feature, as well as ones that won't. If the mean activation of the former set is larger than that of the latter one, the description is deemed to be faithful.

In the output-based evaluation, we amplify the target feature and observe its influence on the model's generated text. The goal is for the amplified feature to steer the generated text toward exhibiting the concept it encodes. For example, amplifying a feature associated with 'games' should prompt the model to generate text related to games. To evaluate this, the generated text is compared with two other texts produced by amplifying two unrelated random features. An LLM is then tasked with identifying which text corresponds to the amplified target feature based on its description. If it answers correctly, the description is deemed to be faithful.

### Results
Unsurprisingly, each method excels in its own category. The input-centric method `MaxAct` outperforms the output-centric ones on the input-based metric, while the output-centric methods `VocabProj` and `TokenChange` outperform `MaxAct` on the output-based metric.

Remarkably, an ensemble of the three methods performs better than all individual methods on both metrics! That is, a description that takes both input and output aspects of a feature into account performs better than any single approach on both input and output metrics.


<div class="l-page" style="display: flex; justify-content: center;">
  <iframe src="{{ '/assets/plotly/enhancing_results.html' | relative_url }}" frameborder='0' scrolling='no' height="400px" width="760px" style="border: 1px dashed grey;"></iframe>
</div>

### Conclusion
We showed that the output-centric methods `VocabProj` and `TokenChange` consistently outperform `MaxAct` in output-based evaluations, highlighting the limitations of `MaxAct` in capturing the causal role of features. Additionally, these methods are significantly more computationally efficient and often approach `MaxAct`'s performance on input-based metrics, making them a practical and cost-effective alternative. Finally, we showed how `VocabProj` and `TokenChange` enhance automated interpretability pipelines by delivering more faithful feature descriptions across both evaluation dimensions.

For a demonstration of how understanding a feature translates into real-world applications, have a look at [this](https://yoav.ml/blog/2025/sae-knowledge-erasure/) blog post showcasing how it can facilitate knowledge erasure in LLMs.
For more details about this work you can read our [paper](https://arxiv.org/abs/2501.08319).

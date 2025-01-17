---
layout: distill
title: Using Sparse Autoencoders for Knowledge Erasure
description: Can we leverage SAEs to effectively erase knowledge from LLMs in a targeted way?
tags: NLP SAEs Interpretability AI ML
giscus_comments: false
date: 2025-01-17
featured: true

authors:
  - name: Yoav Gur Arieh
    url: "https://yoav.ml"
    affiliations:
      name: Tel Aviv University

# bibliography: 2018-12-22-distill.bib

# Optionally, you can add a table of contents to your post.
# NOTES:
#   - make sure that TOC names match the actual section names
#     for hyperlinks within the post to work correctly.
#   - we may want to automate TOC generation in the future using
#     jekyll-toc plugin (https://github.com/toshimaru/jekyll-toc).
---

#### Introduction

Sparse autoencoders (SAEs) have recently been the talk of the town in some circles of interpretability research, and are currently one of the more popular methods for unsupervised feature disentanglement. That is, they can enable us to study and use a more granular and hopefully monosemantic unit in an LLM.

This has made them a particularly intriguing method for influencing LLMs in targeted ways, such as steering. Motivated by this, we explored their potential for **knowledge erasure**, aiming to determine whether they could support the selective removal of targeted information while maintaining the overall utility of a model.

#### Knowledge Erasure

For simplicity, we use the simplistic setting of fact triplets ($s$, $r$, $o$) where $s$ is the subject, $r$ is the relation, and $o$ is the object. In this setting, our goal would be to affect our language model's ability to generate tokens related to $o$ when prompted with $s$ and $r$. For example, when prompted with the sentence "*Barack Obama* (subject) *was born in* (relation)", we want to make it so the language model in question won't answer *Hawaii* (object).

To do this, we'd hope to find an SAE feature that activates when prompted with the subject and relation, and which then promotes the token corresponding to the object. The challenge now is finding such a feature.

#### How to Find SAE Knowledge Features

To find the features of interest, we first need to know where to look. The way LLMs answer knowledge related queries in our setting is detailed in [INSERT REF]. There, they show that the models follow three general steps:

1. Subject enrichment, where the hidden representation of the final token of the subject is enriched by MLP layers with information relating to it. For the subject *Barack Obama*, the token `Obama` would be enriched with information like his birth date, where he went to college, and of course, where he was born.
2. The relation information is propagated from the relation tokens to the final token.
3. The relation information in the final token is used to extract the relevant information from the last subject token to the final token - i.e. in our example the token `Hawaii` would be extracted from the hidden representation in the `Obama` token position, and moved to the final token position.

That means that a good way to erase the knowledge we want to erase, is to find which MLP SAE features are responsible for enriching the subject token with the information we want to erase.

So now we know where to look - MLP SAE features that activate on the last token position of the subject token. But how do we know which one of these tokens?

We could use existing feature descriptions, available for Gemma on Neuronpedia, to isolate ones that look like they relate. But as we showed here [INSERT REF] the methods used for generating these descriptions are mostly related to what activates a feature and not what it does once activated. Therefore, for each feature we can use vocabulary projection on the feature's SAE decode column, and look to see if there are relevant tokens there - i.e. ones related to the object in our fact. Indeed, when looking at all MLP SAE features that activate for the token `Obama`, we see that feature 4999 in layer 6 seems to encode for the concept of the USA, and that `Hawaii` appears in the top 100 tokens of its vocabulary projection. This seems to be the feature we're looking for!

#### Erasing the Knowledge - Ablating the Feature
Now that we have a method for finding the relevant features, we just have to prevent the feature from firing, or, ablating it. Practically, this means overriding its value so it'll always be zero, but like [INSERT REF], we noticed that this doesn't always work well enough, and instead try to set it to negative values.

Now if we ablate the feature we found earlier that encodes for the concept of the USA, and prompt the model to answer where Barack Obama was born, funnily enough it answers **Kenya**! Looks like we might have accidentally made our model a birther...

And these results seem to replicate across many facts!

| Prompt                                     | Original Generation                                                               | Ablated Feature               | New Generation                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Barack Obama was born in                   | **Hawaii**, but he was raised in Indonesia. He was a student at Occidental.       | -US (`6/4999`)                | 1964 in the small town of **Kinyanya, Kenya**.                                                                                       |
| George Bush was the governor of            | **Texas** when he was elected president.                                          | -Texas (`7/10671`)            | **Florida** when he was elected president.                                                                                           |
| The Dalai Lama is a spiritual leader from  | **Tibet**. He is the 14th Dalai Lama                                              | -Tibet (`17/8560`)            | **India**. He is a Nobel Peace Prize winner.                                                                                         |
| Winston Churchil was the Prime Minister of | the **United Kingdom** during World War II. He was a great leader and a ...       | -UK,+US (`14/8456`)           | the **United States** during the Second World War. He was the first person to be elected to the office of Prime Minister in the U.S. |
| Thomas Jefferson wrote the                 | **Declaration of Independence** in 1776. He was the third president ...           | -Founding Fathers (`18/7722`) | **the following** letter to the editor of the New York Journal.                                                                      |
| The Taj Mahal is located in                | the country of **India**, it is a mausoleum build by the Mughal emperor Sha Jahan | -India (`4/16258`)            | the country of **the United States**. It is a monument that is dedicated to the memory ...                                           |
| The Burj Khalifa is located in             | **Dubai**, United Arab Emirates.                                                  | -Dubai (`14/6856`)            | **Chicago**, Illinois.                                                                                                               |
| The Wright brothers invented               | the **airplane** in 1903. The first flight was a ...                              | -Flight (`4/3225`)            | the concep of the **car**. They were the first to use the car as a ...                                                               |
| Marie Antoinette was queen of              | **France** from 1774 to 1792.                                                     | -France (`18/11591`)          | **the United Kingdom** from 1743 to 1745.                                                                                            |
| Marie Curie discovered the element         | **Radium** in 1898 She was awarded the Nobel Prize in Physics in 1903 ...         | -Nuclear (`16/2072`)          | **Platinum** in 1800. It was named after the Greek goddess ...                                                                       |

#### Conclusion, Limitations and Future Directions
Sparse autoencoders offer an exciting approach to knowledge erasure by leveraging their ability to disentangle and manipulate learned representations. We showed that this can enable us to perform targeted erasures, removing the undesirable knowledge and leaving the model still capable. For example, when we ablated the UK feature for Winston Churchil, the model continued the prompt saying that he was the prime minister of the US. But, it also added that it was during the Second World War (correct period) and that he was the first person to be elected to that office! Meaning while we edited the fact such that UK -> US, the model still has its context about the US governing structure. 

While these experiments showed exciting potential, this is just a proof-of-concept. To understand if SAEs are really a useful method for knowledge erasure (and knowledge editing more generally), we must evaluate their efficacy in a systematic way - testing how effective they are at editing knowledge without affecting the model adversely.

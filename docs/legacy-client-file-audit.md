# Legacy Client Audit (File-by-file)

Generated on: 2026-02-20 04:29:22Z

Total files: 471

## Summary by kind

| kind | count |
|---|---:|
| building_gameplay_logic | 48 |
| core_gameplay_or_flow | 23 |
| flash_binary_morphshape | 1 |
| flash_symbol_wrapper | 60 |
| font_asset | 10 |
| image_asset_numeric_id | 251 |
| image_asset_semantic_name | 65 |
| misc_actionscript | 3 |
| ui_behavior_flash | 10 |

## Summary by reuse_action

| reuse_action | count |
|---|---:|
| analyze_case_by_case | 3 |
| extract_and_convert | 1 |
| port_rules_and_data | 48 |
| reference_only | 60 |
| reuse_after_license_check | 10 |
| reuse_via_atlas_pipeline | 65 |
| reuse_with_symbol_mapping | 251 |
| rewrite_ui | 10 |
| split_port | 23 |

## Priority High Files

| path | kind | action | class | extends | lines |
|---|---|---|---|---|---:|
| `morphshapes/1817.swf` | flash_binary_morphshape | extract_and_convert | - | - | 0 |
| `scripts/ACADEMY.as` | core_gameplay_or_flow | split_port | ACADEMY | - | 269 |
| `scripts/ACHIEVEMENTS.as` | core_gameplay_or_flow | split_port | ACHIEVEMENTS | - | 203 |
| `scripts/ATTACK.as` | core_gameplay_or_flow | split_port | ATTACK | - | 1336 |
| `scripts/BASE.as` | core_gameplay_or_flow | split_port | BASE | - | 6682 |
| `scripts/BDECORATION.as` | building_gameplay_logic | port_rules_and_data | BDECORATION | BFOUNDATION | 50 |
| `scripts/BEXPIRABLE.as` | building_gameplay_logic | port_rules_and_data | BEXPIRABLE | BFOUNDATION | 52 |
| `scripts/BFOUNDATION.as` | building_gameplay_logic | port_rules_and_data | BFOUNDATION | GameObject | 4414 |
| `scripts/BHEAVYTRAP.as` | building_gameplay_logic | port_rules_and_data | BHEAVYTRAP | BTRAP | 135 |
| `scripts/BMUSHROOM.as` | building_gameplay_logic | port_rules_and_data | BMUSHROOM | BFOUNDATION | 129 |
| `scripts/BRESOURCE.as` | building_gameplay_logic | port_rules_and_data | BRESOURCE | BFOUNDATION | 655 |
| `scripts/BSTORAGE.as` | building_gameplay_logic | port_rules_and_data | BSTORAGE | BFOUNDATION | 192 |
| `scripts/BTOTEM.as` | building_gameplay_logic | port_rules_and_data | BTOTEM | BDECORATION | 339 |
| `scripts/BTOWER.as` | building_gameplay_logic | port_rules_and_data | BTOWER | BFOUNDATION | 630 |
| `scripts/BTRAP.as` | building_gameplay_logic | port_rules_and_data | BTRAP | BFOUNDATION | 180 |
| `scripts/BUILDING1.as` | building_gameplay_logic | port_rules_and_data | BUILDING1 | BRESOURCE | 64 |
| `scripts/BUILDING10.as` | building_gameplay_logic | port_rules_and_data | BUILDING10 | BFOUNDATION | 94 |
| `scripts/BUILDING11.as` | building_gameplay_logic | port_rules_and_data | BUILDING11 | BFOUNDATION | 315 |
| `scripts/BUILDING112.as` | building_gameplay_logic | port_rules_and_data | BUILDING112 | BSTORAGE | 93 |
| `scripts/BUILDING113.as` | building_gameplay_logic | port_rules_and_data | BUILDING113 | BFOUNDATION | 62 |
| `scripts/BUILDING115.as` | building_gameplay_logic | port_rules_and_data | BUILDING115 | BTOWER | 243 |
| `scripts/BUILDING117.as` | building_gameplay_logic | port_rules_and_data | BUILDING117 | BHEAVYTRAP | 24 |
| `scripts/BUILDING118.as` | building_gameplay_logic | port_rules_and_data | BUILDING118 | BTOWER | 314 |
| `scripts/BUILDING12.as` | building_gameplay_logic | port_rules_and_data | BUILDING12 | BFOUNDATION | 86 |
| `scripts/BUILDING13.as` | building_gameplay_logic | port_rules_and_data | BUILDING13 | HatcheryBase | 624 |
| `scripts/BUILDING14.as` | building_gameplay_logic | port_rules_and_data | BUILDING14 | BSTORAGE | 222 |
| `scripts/BUILDING15.as` | building_gameplay_logic | port_rules_and_data | BUILDING15 | BFOUNDATION | 143 |
| `scripts/BUILDING16.as` | building_gameplay_logic | port_rules_and_data | BUILDING16 | HatcheryBase | 378 |
| `scripts/BUILDING17.as` | building_gameplay_logic | port_rules_and_data | BUILDING17 | BWALL | 47 |
| `scripts/BUILDING18.as` | building_gameplay_logic | port_rules_and_data | BUILDING18 | BWALL | 38 |
| `scripts/BUILDING19.as` | building_gameplay_logic | port_rules_and_data | BUILDING19 | BFOUNDATION | 171 |
| `scripts/BUILDING2.as` | building_gameplay_logic | port_rules_and_data | BUILDING2 | BRESOURCE | 66 |
| `scripts/BUILDING20.as` | building_gameplay_logic | port_rules_and_data | BUILDING20 | BTOWER | 57 |
| `scripts/BUILDING21.as` | building_gameplay_logic | port_rules_and_data | BUILDING21 | BTOWER | 88 |
| `scripts/BUILDING22.as` | building_gameplay_logic | port_rules_and_data | BUILDING22 | Bunker | 858 |
| `scripts/BUILDING23.as` | building_gameplay_logic | port_rules_and_data | BUILDING23 | BTOWER | 122 |
| `scripts/BUILDING24.as` | building_gameplay_logic | port_rules_and_data | BUILDING24 | BTRAP | 17 |
| `scripts/BUILDING25.as` | building_gameplay_logic | port_rules_and_data | BUILDING25 | BTOWER | 268 |
| `scripts/BUILDING26.as` | building_gameplay_logic | port_rules_and_data | BUILDING26 | BFOUNDATION | 153 |
| `scripts/BUILDING27.as` | building_gameplay_logic | port_rules_and_data | BUILDING27 | BFOUNDATION | 170 |
| `scripts/BUILDING3.as` | building_gameplay_logic | port_rules_and_data | BUILDING3 | BRESOURCE | 61 |
| `scripts/BUILDING4.as` | building_gameplay_logic | port_rules_and_data | BUILDING4 | BRESOURCE | 65 |
| `scripts/BUILDING5.as` | building_gameplay_logic | port_rules_and_data | BUILDING5 | BFOUNDATION | 136 |
| `scripts/BUILDING51.as` | building_gameplay_logic | port_rules_and_data | BUILDING51 | BFOUNDATION | 146 |
| `scripts/BUILDING52.as` | building_gameplay_logic | port_rules_and_data | BUILDING52 | BEXPIRABLE | 61 |
| `scripts/BUILDING6.as` | building_gameplay_logic | port_rules_and_data | BUILDING6 | BSTORAGE | 121 |
| `scripts/BUILDING7.as` | building_gameplay_logic | port_rules_and_data | BUILDING7 | BMUSHROOM | 18 |
| `scripts/BUILDING8.as` | building_gameplay_logic | port_rules_and_data | BUILDING8 | BFOUNDATION | 161 |
| `scripts/BUILDING9.as` | building_gameplay_logic | port_rules_and_data | BUILDING9 | BFOUNDATION | 257 |
| `scripts/BUILDINGBUTTON.as` | core_gameplay_or_flow | split_port | BUILDINGBUTTON | BUILDINGBUTTON_CLIP | 176 |
| `scripts/BUILDINGINFO.as` | core_gameplay_or_flow | split_port | BUILDINGINFO | - | 769 |
| `scripts/BUILDINGOPTIONS.as` | core_gameplay_or_flow | split_port | BUILDINGOPTIONS | - | 50 |
| `scripts/BUILDINGS.as` | core_gameplay_or_flow | split_port | BUILDINGS | - | 82 |
| `scripts/BUILDINGSPOPUP.as` | core_gameplay_or_flow | split_port | BUILDINGSPOPUP | BUILDINGSPOPUP_CLIP | 353 |
| `scripts/BUY.as` | core_gameplay_or_flow | split_port | BUY | - | 510 |
| `scripts/BWALL.as` | building_gameplay_logic | port_rules_and_data | BWALL | BFOUNDATION | 44 |
| `scripts/Bunker.as` | building_gameplay_logic | port_rules_and_data | Bunker | BFOUNDATION | 18 |
| `scripts/CATAPULTITEM.as` | core_gameplay_or_flow | split_port | CATAPULTITEM | CATAPULTITEM_view | 144 |
| `scripts/CATAPULTPOPUP.as` | core_gameplay_or_flow | split_port | CATAPULTPOPUP | CATAPULTPOPUP_view | 286 |
| `scripts/CHAMPIONCAGE.as` | building_gameplay_logic | port_rules_and_data | CHAMPIONCAGE | BFOUNDATION | 1087 |
| `scripts/CHAMPIONCAGEPOPUP.as` | core_gameplay_or_flow | split_port | CHAMPIONCAGEPOPUP | GUARDIANCAGEPOPUP_CLIP | 1469 |
| `scripts/CHAMPIONCHAMBER.as` | building_gameplay_logic | port_rules_and_data | CHAMPIONCHAMBER | BFOUNDATION | 475 |
| `scripts/CHAMPIONCHAMBERPOPUP.as` | core_gameplay_or_flow | split_port | CHAMPIONCHAMBERPOPUP | GUARDIANCHAMBERPOPUP_CLIP | 253 |
| `scripts/CHAMPIONNAMEPOPUP.as` | core_gameplay_or_flow | split_port | CHAMPIONNAMEPOPUP | GUARDIANNAMEPOPUP_CLIP | 58 |
| `scripts/CHAMPIONSELECTPOPUP.as` | core_gameplay_or_flow | split_port | CHAMPIONSELECTPOPUP | GUARDIANSELECTPOPUP_CLIP | 121 |
| `scripts/CREATURELOCKER.as` | core_gameplay_or_flow | split_port | CREATURELOCKER | - | 1371 |
| `scripts/CREATURELOCKERPOPUP.as` | core_gameplay_or_flow | split_port | CREATURELOCKERPOPUP | CREATURELOCKERPOPUP_CLIP | 560 |
| `scripts/CREATURES.as` | core_gameplay_or_flow | split_port | CREATURES | - | 370 |
| `scripts/CREEPS.as` | core_gameplay_or_flow | split_port | CREEPS | - | 500 |
| `scripts/CUSTOMATTACKS.as` | core_gameplay_or_flow | split_port | CUSTOMATTACKS | - | 120 |
| `scripts/DROPZONE.as` | core_gameplay_or_flow | split_port | DROPZONE | DROPZONE_CLIP | 245 |
| `scripts/EFFECTS.as` | core_gameplay_or_flow | split_port | EFFECTS | - | 323 |

## Detailed File Matrix

| path | ext | kind | priority | action | target | class | extends | lines | notes |
|---|---|---|---|---|---|---|---|---:|---|
| `buttons/DefineButton2_1290/1.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `buttons/DefineButton2_2187/1.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `buttons/DefineButton2_2189/1.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `buttons/DefineButton2_2723/1.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `buttons/DefineButton2_2864/1.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `fonts/1764_GROBOLD.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/2465_Verdana.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/2488_Verdana.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/2491_GROBOLDpro.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/2960_Verdana Bold.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/3014_Verdana.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/3057_Groboldov Bold.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/31_Groboldov.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/36_Verdana.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `fonts/4_Verdana.ttf` | ttf | font_asset | medium | reuse_after_license_check | client_assets/fonts | - | - | 0 | Validar licenca e fallback cross-platform |
| `frames/1.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1136.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1139.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1141.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1143.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1146.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1149.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1151.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1153.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1168.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1237.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1266.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1282.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/129.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/131.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/136.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/144.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/146.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1464.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1466.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/148.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1485.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/152.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1522.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1524.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1527.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1530.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/154.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/156.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1562.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1565_smoke1_smoke1.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/158.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/160.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/163.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/165.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1667_bmp_healthbarsmall_bmp_healthbarsmall.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/167.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1670.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1672.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1674.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1676.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1678.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1680.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1683.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1685.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1687.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1689.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1691.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1693.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1699_frame_button_help_frame_button_help.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/1704_bmp_healthbarlarge_bmp_healthbarlarge.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/1705_bmp_overlaytext_bmp_overlaytext.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/1706_bmp_progressbarlarge_bmp_progressbarlarge.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/173.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1732.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/177.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/179.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/181.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1816_bmd_burns_bmd_burns.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/1820_ParticleScorch1_ParticleScorch1.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/183.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1849.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/185.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/187.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/189.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/191.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1918.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1920.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1925.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1927.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/193.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/1944.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2045_frame2_bottom_right_frame2_bottom_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2046_frame3_filler_right_frame3_filler_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2047_frame2_filler_top_frame2_filler_top.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2048_frame3_top_right_frame3_top_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2049_frame3_background_frame3_background.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2050_frame_button_close_frame_button_close.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2051_frame2_top_right_frame2_top_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2052_frame2_background_frame2_background.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2053_frame2_top_left_frame2_top_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2054_frame2_filler_bottom_frame2_filler_bottom.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2055_frame3_top_left_frame3_top_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2056_frame3_filler_left_frame3_filler_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2057_frame3_filler_bottom_frame3_filler_bottom.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2058_frame2_filler_right_frame2_filler_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2059_frame2_filler_left_frame2_filler_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2060_frame3_bottom_left_frame3_bottom_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2061_frame2_bottom_left_frame2_bottom_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2062_frame3_bottom_right_frame3_bottom_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2063_frame3_filler_top_frame3_filler_top.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2065.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2070.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2132.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2135.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2137.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2141.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2146.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2149.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2151.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2164_isosand3_isosand3.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2165_inferno_lava4_inferno_lava4.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2166_isosand4_isosand4.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2167_isosand1_isosand1.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2168_isosand2_isosand2.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2169_inferno_lava1_inferno_lava1.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2170_inferno_lava3_inferno_lava3.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2171_inferno_lava2_inferno_lava2.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2172_isograss3_isograss3.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2173_isograss4_isograss4.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2174_isograss1_isograss1.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2175_isograss2_isograss2.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2176_isograss7_isograss7.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2177_isograss5_isograss5.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2178_isograss6_isograss6.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2179_isocrater1_isocrater1.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2180_isorock1_isorock1.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2181_isorock3_isorock3.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2182_isorock2_isorock2.jpg` | jpg | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2204.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2206.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2209.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2211.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2214.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2216.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2330.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2339.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2341.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2343.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2345.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2347.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2350.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2360.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2363.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2365.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2367.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2370.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2372.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2376.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2378.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2417.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2442.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2460.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2462.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2469.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2471.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2494.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2496.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2515.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2518.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2546.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2548.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/255.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/259.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/264.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2654_screenshot_border3_screenshot_border3.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2655_screenshot_border2_screenshot_border2.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2656_screenshot_border1_screenshot_border1.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2671_frame1_bottom_left_frame1_bottom_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2672_frame1_bottom_middle_frame1_bottom_middle.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2673_frame1_top_right_frame1_top_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2674_frame1_button_fullscreen_frame1_button_fullscreen.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2675_frame1_filler_left_frame1_filler_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2676_frame1_bottom_right_frame1_bottom_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2677_frame1_filler_right_frame1_filler_right.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2678_frame1_filler_bottom_frame1_filler_bottom.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2679_frame1_button_help_frame1_button_help.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2680_frame1_top_middle_frame1_top_middle.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2681_frame1_filler_top_frame1_filler_top.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2682_frame1_top_middle_2_frame1_top_middle_2.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2683_frame1_top_left_frame1_top_left.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2684_frame1_button_close_frame1_button_close.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2724.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2728.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2736.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2740.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2744.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2748.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/275.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2752.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2756.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2760.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2767.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2772.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2777_pushpins_pushpins.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2778_pin_shadow_pin_shadow.png` | png | image_asset_semantic_name | medium | reuse_via_atlas_pipeline | client_assets/atlases | - | - | 0 | Nome semantico sugere utilidade direta |
| `images/2787.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2820.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2823.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2826.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2830.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2835.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2854.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2856.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2862.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2982.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2983.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2986.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2989.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2992.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/2996.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3002.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3004.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/306.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3069.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3071.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/308.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3080.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/310.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/312.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3122.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3125.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3128.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3131.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3134.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/3137.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/314.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/347.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/363.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/365.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/368.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/370.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/372.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/374.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/376.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/378.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/380.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/382.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/384.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/386.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/388.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/39.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/390.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/392.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/394.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/396.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/398.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/400.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/402.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/404.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/406.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/408.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/410.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/412.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/414.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/416.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/418.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/420.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/422.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/424.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/426.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/428.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/430.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/432.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/434.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/436.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/438.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/440.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/442.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/444.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/446.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/448.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/450.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/452.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/454.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/456.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/458.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/46.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/460.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/462.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/464.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/466.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/468.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/470.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/472.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/474.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/477.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/482.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/49.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/508.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/516.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/536.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/537.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/55.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/551.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/557.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/564.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/567.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/571.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/574.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/581.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/593.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/598.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/606.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/609.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/612.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/618.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/622.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/625.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/646.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/650.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/659.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/66.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/674.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/679.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/681.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/684.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/687.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/690.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/696.jpg` | jpg | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `images/87.png` | png | image_asset_numeric_id | medium | reuse_with_symbol_mapping | client_assets/atlases | - | - | 0 | ID numerico; mapear para simbolo funcional |
| `morphshapes/1817.swf` | swf | flash_binary_morphshape | high | extract_and_convert | client_assets/spritesheets | - | - | 0 | Nao usar SWF em runtime; extrair para PNG/atlas |
| `scripts/ACADEMY.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | ACADEMY | - | 269 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save domain |
| `scripts/ACADEMYPOPUP.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | ACADEMYPOPUP | ACADEMYPOPUP_CLIP | 620 | Manter copy/fluxo; reimplementar componentes | signals:flash global domain |
| `scripts/ACADEMYPOPUP_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ACADEMYPOPUP_CLIP | MovieClip | 99 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ACHIEVEMENTS.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | ACHIEVEMENTS | - | 203 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:global maproom domain |
| `scripts/AIATTACKPOPUP_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | AIATTACKPOPUP_CLIP | MovieClip | 34 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ATTACK.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | ATTACK | - | 1336 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save maproom domain |
| `scripts/BASE.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | BASE | - | 6682 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save maproom domain |
| `scripts/BDECORATION.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BDECORATION | BFOUNDATION | 50 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BEXPIRABLE.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BEXPIRABLE | BFOUNDATION | 52 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BFOUNDATION.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BFOUNDATION | GameObject | 4414 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global save maproom domain |
| `scripts/BHEAVYTRAP.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BHEAVYTRAP | BTRAP | 135 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BMUSHROOM.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BMUSHROOM | BFOUNDATION | 129 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BRESOURCE.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BRESOURCE | BFOUNDATION | 655 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global maproom domain |
| `scripts/BSTORAGE.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BSTORAGE | BFOUNDATION | 192 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:global maproom domain |
| `scripts/BTOTEM.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BTOTEM | BDECORATION | 339 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:global domain |
| `scripts/BTOWER.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BTOWER | BFOUNDATION | 630 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global maproom |
| `scripts/BTRAP.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BTRAP | BFOUNDATION | 180 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING1.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING1 | BRESOURCE | 64 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING10.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING10 | BFOUNDATION | 94 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING11.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING11 | BFOUNDATION | 315 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global maproom |
| `scripts/BUILDING112.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING112 | BSTORAGE | 93 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global maproom |
| `scripts/BUILDING113.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING113 | BFOUNDATION | 62 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING115.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING115 | BTOWER | 243 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING117.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING117 | BHEAVYTRAP | 24 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash |
| `scripts/BUILDING118.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING118 | BTOWER | 314 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING12.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING12 | BFOUNDATION | 86 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING13.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING13 | HatcheryBase | 624 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING14.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING14 | BSTORAGE | 222 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global maproom |
| `scripts/BUILDING15.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING15 | BFOUNDATION | 143 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global maproom |
| `scripts/BUILDING16.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING16 | HatcheryBase | 378 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING17.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING17 | BWALL | 47 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING18.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING18 | BWALL | 38 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash |
| `scripts/BUILDING19.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING19 | BFOUNDATION | 171 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING2.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING2 | BRESOURCE | 66 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING20.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING20 | BTOWER | 57 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING21.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING21 | BTOWER | 88 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING22.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING22 | Bunker | 858 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global save maproom domain |
| `scripts/BUILDING23.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING23 | BTOWER | 122 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING24.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING24 | BTRAP | 17 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash |
| `scripts/BUILDING25.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING25 | BTOWER | 268 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING26.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING26 | BFOUNDATION | 153 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING27.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING27 | BFOUNDATION | 170 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global maproom domain |
| `scripts/BUILDING3.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING3 | BRESOURCE | 61 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING4.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING4 | BRESOURCE | 65 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING5.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING5 | BFOUNDATION | 136 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING51.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING51 | BFOUNDATION | 146 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING52.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING52 | BEXPIRABLE | 61 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING6.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING6 | BSTORAGE | 121 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BUILDING7.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING7 | BMUSHROOM | 18 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash |
| `scripts/BUILDING8.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING8 | BFOUNDATION | 161 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global domain |
| `scripts/BUILDING9.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BUILDING9 | BFOUNDATION | 257 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global save domain |
| `scripts/BUILDINGBUTTON.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | BUILDINGBUTTON | BUILDINGBUTTON_CLIP | 176 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global |
| `scripts/BUILDINGBUTTONSOON.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BUILDINGBUTTONSOON | MovieClip | 18 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BUILDINGBUTTON_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BUILDINGBUTTON_CLIP | MovieClip | 30 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BUILDINGINFO.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | BUILDINGINFO | - | 769 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global maproom domain |
| `scripts/BUILDINGOPTIONS.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | BUILDINGOPTIONS | - | 50 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global |
| `scripts/BUILDINGOPTIONSPOPUP.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | BUILDINGOPTIONSPOPUP | BUILDINGOPTIONSPOPUP_CLIP | 1152 | Manter copy/fluxo; reimplementar componentes | signals:flash global domain |
| `scripts/BUILDINGOPTIONSPOPUP_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BUILDINGOPTIONSPOPUP_CLIP | MovieClip | 30 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BUILDINGS.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | BUILDINGS | - | 82 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global maproom domain |
| `scripts/BUILDINGSARROW.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BUILDINGSARROW | MovieClip | 58 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BUILDINGSPOPUP.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | BUILDINGSPOPUP | BUILDINGSPOPUP_CLIP | 353 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global domain |
| `scripts/BUILDINGSPOPUPINFO_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BUILDINGSPOPUPINFO_CLIP | MovieClip | 28 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BUILDINGSPOPUP_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BUILDINGSPOPUP_CLIP | MovieClip | 32 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BUY.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | BUY | - | 510 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save domain |
| `scripts/BWALL.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | BWALL | BFOUNDATION | 44 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global |
| `scripts/BasePlannerPopup_BottomLayout.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_BottomLayout | MovieClip | 40 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_CLIP | MovieClip | 23 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_DisplayItem_Building.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_DisplayItem_Building | MovieClip | 31 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_DisplayViewContainer.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_DisplayViewContainer | MovieClip | 23 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ExplorerCanvas.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ExplorerCanvas | MovieClip | 19 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ExplorerContainer.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ExplorerContainer | MovieClip | 25 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ExplorerFrame.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ExplorerFrame | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ExplorerHeader.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ExplorerHeader | MovieClip | 18 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ExplorerItem_Category.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ExplorerItem_Category | MovieClip | 24 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ExplorerItem_Type.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ExplorerItem_Type | MovieClip | 22 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ToolTip.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ToolTip | MovieClip | 20 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ToolsButton_Move.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ToolsButton_Move | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ToolsButton_Store.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ToolsButton_Store | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ToolsLayout.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ToolsLayout | MovieClip | 23 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_ZoomLayout.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_ZoomLayout | MovieClip | 23 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerPopup_xSpot.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerPopup_xSpot | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerTransferConfirmation_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerTransferConfirmation_CLIP | MovieClip | 26 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerTransferRow_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerTransferRow_CLIP | MovieClip | 29 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlannerTransfer_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlannerTransfer_CLIP | MovieClip | 22 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlanner_FrameMask.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | BasePlanner_FrameMask | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BasePlanner_fla/CheckBox_3.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_3 | MovieClip | 16 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/BlackSpurtzCannon.as` | as | misc_actionscript | medium | analyze_case_by_case | depends | BlackSpurtzCannon | SpurtzCannon | 14 | Arquivo AS sem padrao dominante |
| `scripts/Bunker.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | Bunker | BFOUNDATION | 18 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi |
| `scripts/Button.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | Button | MovieClip | 207 | Manter copy/fluxo; reimplementar componentes | signals:flash |
| `scripts/ButtonBrown.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | ButtonBrown | MovieClip | 222 | Manter copy/fluxo; reimplementar componentes | signals:flash |
| `scripts/ButtonBrown_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ButtonBrown_CLIP | ButtonBrown | 13 | Embed/MovieClip wrapper; nao portar codigo |
| `scripts/Button_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | Button_CLIP | Button | 13 | Embed/MovieClip wrapper; nao portar codigo |
| `scripts/CATAPULTITEM.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CATAPULTITEM | CATAPULTITEM_view | 144 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global |
| `scripts/CATAPULTITEM_view.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CATAPULTITEM_view | MovieClip | 17 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CATAPULTPOPUP.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CATAPULTPOPUP | CATAPULTPOPUP_view | 286 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global domain |
| `scripts/CATAPULTPOPUP_view.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CATAPULTPOPUP_view | Sprite | 20 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CHAMPIONBUTTON.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | CHAMPIONBUTTON | GUARDIANBUTTON_CLIP | 129 | Manter copy/fluxo; reimplementar componentes | signals:flash global domain |
| `scripts/CHAMPIONCAGE.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | CHAMPIONCAGE | BFOUNDATION | 1087 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global save maproom domain |
| `scripts/CHAMPIONCAGEPOPUP.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CHAMPIONCAGEPOPUP | GUARDIANCAGEPOPUP_CLIP | 1469 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save domain |
| `scripts/CHAMPIONCHAMBER.as` | as | building_gameplay_logic | high | port_rules_and_data | server_authoritative_cmd+building_defs | CHAMPIONCHAMBER | BFOUNDATION | 475 | Reaproveitar regras (custos, timers, requisitos), reescrever runtime Pixi | signals:flash global save domain |
| `scripts/CHAMPIONCHAMBERPOPUP.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CHAMPIONCHAMBERPOPUP | GUARDIANCHAMBERPOPUP_CLIP | 253 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global |
| `scripts/CHAMPIONNAMEPOPUP.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CHAMPIONNAMEPOPUP | GUARDIANNAMEPOPUP_CLIP | 58 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save domain |
| `scripts/CHAMPIONSELECTPOPUP.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CHAMPIONSELECTPOPUP | GUARDIANSELECTPOPUP_CLIP | 121 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save domain |
| `scripts/CHECKER.as` | as | misc_actionscript | medium | analyze_case_by_case | depends | CHECKER | - | 27 | Arquivo AS sem padrao dominante |
| `scripts/CREATUREBUTTON.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | CREATUREBUTTON | CREATUREBUTTON_CLIP | 190 | Manter copy/fluxo; reimplementar componentes | signals:flash global domain |
| `scripts/CREATUREBUTTON_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CREATUREBUTTON_CLIP | MovieClip | 30 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CREATURELOCKER.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CREATURELOCKER | - | 1371 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save maproom domain |
| `scripts/CREATURELOCKERPOPUP.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CREATURELOCKERPOPUP | CREATURELOCKERPOPUP_CLIP | 560 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global domain |
| `scripts/CREATURELOCKERPOPUP_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CREATURELOCKERPOPUP_CLIP | MovieClip | 80 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CREATURES.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CREATURES | - | 370 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global maproom domain |
| `scripts/CREEPS.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CREEPS | - | 500 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global maproom domain |
| `scripts/CUSTOMATTACKS.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | CUSTOMATTACKS | - | 120 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global save maproom domain |
| `scripts/CarouselCategoryButton2.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CarouselCategoryButton2 | MovieClip | 24 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ChampionChamberFrozen.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ChampionChamberFrozen | MovieClip | 22 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ChatBox_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ChatBox_CLIP | MovieClip | 19 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ChatBox_msg_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ChatBox_msg_CLIP | MovieClip | 22 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ChatBox_msg_name_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ChatBox_msg_name_CLIP | MovieClip | 20 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ChatUI_fla/ChatBox_ignoreBtn_17.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ChatBox_ignoreBtn_17 | MovieClip | 16 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ChatUI_fla/ChatBox_msg_bg_16.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ChatBox_msg_bg_16 | MovieClip | 16 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/ChatUI_fla/chat_window_box_10.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | chat_window_box_10 | MovieClip | 16 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_CLIP | MovieClip | 16 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_disabledIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_disabledIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_downIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_downIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_overIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_overIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_selectedDisabledIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_selectedDisabledIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_selectedDownIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_selectedDownIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_selectedOverIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_selectedOverIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_selectedUpIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_selectedUpIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/CheckBox_upIcon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CheckBox_upIcon | MovieClip | 15 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/Checkbox.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | Checkbox | CheckBox_CLIP | 192 | Manter copy/fluxo; reimplementar componentes | signals:flash |
| `scripts/CreatureLockerItem.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | CreatureLockerItem | MovieClip | 22 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/DEFENSEEVENTPOPUP.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | DEFENSEEVENTPOPUP | DEFENSEEVENTPOPUP_CLIP | 76 | Manter copy/fluxo; reimplementar componentes | signals:flash global |
| `scripts/DEFENSEEVENTPOPUP_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | DEFENSEEVENTPOPUP_CLIP | MovieClip | 27 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/DEFENSEEVENTPOPUP_WM1.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | DEFENSEEVENTPOPUP_WM1 | DEFENSEEVENTPOPUP_CLIP | 115 | Manter copy/fluxo; reimplementar componentes | signals:flash global |
| `scripts/DROPZONE.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | DROPZONE | DROPZONE_CLIP | 245 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash domain |
| `scripts/DROPZONE_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | DROPZONE_CLIP | MovieClip | 17 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/Dynamic.as` | as | misc_actionscript | medium | analyze_case_by_case | depends | Dynamic | - | 11 | Arquivo AS sem padrao dominante |
| `scripts/EFFECTS.as` | as | core_gameplay_or_flow | high | split_port | server_rules+client_ui_flow | EFFECTS | - | 323 | Extrair regras de dominio e contratos; remover acoplamento Flash | signals:flash global |
| `scripts/ERRORMESSAGE.as` | as | ui_behavior_flash | medium | rewrite_ui | pixi_scene_or_html_overlay | ERRORMESSAGE | ERRORMESSAGE_CLIP | 99 | Manter copy/fluxo; reimplementar componentes | signals:flash global |
| `scripts/ERRORMESSAGE_CLIP.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | ERRORMESSAGE_CLIP | MovieClip | 20 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/EventRewardRibbon.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | EventRewardRibbon | MovieClip | 21 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/EventStoreDisplayItem.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | EventStoreDisplayItem | MovieClip | 36 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/EventStoreItemSelectedPopupMC.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | EventStoreItemSelectedPopupMC | MovieClip | 32 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |
| `scripts/EventStorePopupMC.as` | as | flash_symbol_wrapper | low | reference_only | design_specs_only | EventStorePopupMC | MovieClip | 25 | Embed/MovieClip wrapper; nao portar codigo | signals:flash |

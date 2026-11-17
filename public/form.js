(async () => {
  'use strict';
  const init = await new Promise(resolve => {
    window.addEventListener('message', e => {
      if (e.origin === location.origin && e.source === parent && e.data.type === 'init') resolve(e
        .data)
    });
    parent.postMessage({
      type: 'ready'
    }, location.origin)
  });

  const FACTORIES = init.factories;
  // Research-informed, user-observable categories. These are NOT verified engineering diagnoses.
  const AREAS = [{
    id: 'production',
    name: 'الإنتاج وكفاءة التشغيل',
    discipline: ['industrial_engineering', 'manufacturing_process'],
    items: [
      ['low_output', 'الإنتاج أقل من المعتاد'],
      ['slow_line', 'سرعة التشغيل أبطأ من المتوقع'],
      ['micro_stops', 'توقفات قصيرة ومتكررة'],
      ['bottleneck', 'انتظار أو تكدس بين مراحل الإنتاج'],
      ['high_scrap', 'فاقد أو إعادة تشغيل كثيرة'],
      ['long_changeover', 'تغيير المنتج أو إعداد الخط يستغرق وقتا طويلا'],
      ['unstable_output', 'كمية الإنتاج تتغير من وردية لأخرى']
    ]
  }, {
    id: 'machines',
    name: 'المعدات والهندسة الميكانيكية',
    discipline: ['mechanical_engineering', 'maintenance'],
    items: [
      ['machine_breakdown', 'ماكينة تتعطل أو تتوقف فجأة'],
      ['vibration', 'اهتزاز أو صوت غير معتاد'],
      ['overheat', 'سخونة أعلى من المعتاد'],
      ['wear', 'تآكل أو تلف قطع متكرر'],
      ['spare_part', 'قطعة غيار غير متوفرة أو لا تعيش طويلا'],
      ['machine_accuracy', 'الماكينة لا تحافظ على الدقة'],
      ['setup_problem', 'ضبط الماكينة يتكرر أو يأخذ وقتا'],
      ['machine_capacity', 'قدرة الماكينة لا تكفي الاحتياج']
    ]
  }, {
    id: 'electric',
    name: 'الكهرباء والطاقة',
    discipline: ['electrical_engineering', 'energy_systems'],
    items: [
      ['power_outage', 'انقطاع الكهرباء عن المصنع أو جزء منه'],
      ['machine_trip', 'ماكينات أو قواطع تفصل كهربائيا'],
      ['voltage', 'إضاءة أو جهد غير مستقر'],
      ['motor_issue', 'موتور يسحب تيارا أو يسخن بشكل غير طبيعي'],
      ['energy_spike', 'استهلاك الطاقة ارتفع دون سبب واضح'],
      ['power_cost', 'تكلفة الطاقة مرتفعة مقارنة بالإنتاج'],
      ['peak_load', 'أحمال الذروة تسبب توقفا أو قيودا']
    ]
  }, {
    id: 'utilities',
    name: 'مرافق التشغيل والتبريد والحرارة',
    discipline: ['mechanical_engineering', 'thermal_engineering'],
    items: [
      ['water_low', 'المياه غير كافية أو ضغطها غير ثابت'],
      ['water_quality', 'جودة المياه تؤثر على التشغيل'],
      ['steam_low', 'ضغط البخار أو تدفقه غير مستقر'],
      ['air_compressed', 'الهواء المضغوط لا يكفي أو ضغطه يتغير'],
      ['gas_issue', 'إمداد الغاز أو الوقود غير منتظم'],
      ['cooling', 'التبريد غير كاف أو غير ثابت'],
      ['heating', 'التسخين أو توزيع الحرارة غير منتظم'],
      ['leak', 'تسرب مياه أو بخار أو هواء مضغوط']
    ]
  }, {
    id: 'materials',
    name: 'الخامات والتركيبات والكيمياء',
    discipline: ['materials_science', 'chemical_engineering'],
    items: [
      ['raw_variability', 'خواص الخامة تختلف من دفعة لأخرى'],
      ['raw_rejection', 'خامة لا تحقق المواصفات المطلوبة'],
      ['formulation', 'تركيبة المادة أو نسب الخلط لا تعطي النتيجة المطلوبة'],
      ['chemical_reaction', 'التفاعل أو المعالجة الكيميائية غير مستقرة'],
      ['corrosion', 'تآكل أو تفاعل غير مرغوب فيه'],
      ['alternative_material', 'نحتاج بديلا تقنيا لخامة مستوردة'],
      ['shelf_life', 'الخامة أو المنتج يفقد خواصه أثناء التخزين'],
      ['material_consumption', 'استهلاك الخامة أعلى من المعتاد']
    ]
  }, {
    id: 'quality',
    name: 'الجودة وعيوب المنتج',
    discipline: ['quality_engineering', 'metrology'],
    items: [
      ['reject_rate', 'نسبة عيوب أو منتجات مرفوضة مرتفعة'],
      ['dimension', 'أبعاد المنتج غير دقيقة أو غير ثابتة'],
      ['finish', 'سطح أو لون أو شكل المنتج غير مطابق'],
      ['strength', 'متانة أو أداء المنتج أقل من المطلوب'],
      ['batch_variation', 'النتيجة تختلف من دفعة لأخرى'],
      ['customer_return', 'شكاوى أو مرتجعات بسبب عيب فني'],
      ['contamination', 'تلوث أو شوائب في المنتج'],
      ['test_conflict', 'نتائج اختبارات الجودة غير متطابقة']
    ]
  }, {
    id: 'design',
    name: 'تصميم المنتج والتعبئة والتغليف',
    discipline: ['product_design', 'materials_science'],
    items: [
      ['product_function', 'المنتج لا يؤدي الوظيفة المطلوبة'],
      ['design_complex', 'تصميم المنتج صعب التصنيع أو التجميع'],
      ['pack_damage', 'العبوات تتلف أو تتشوه'],
      ['pack_seal', 'مشكلات الغلق أو إحكام العبوة'],
      ['pack_material', 'خامة التغليف لا تحافظ على المنتج'],
      ['prototype', 'نحتاج نموذجا أوليا أو إعادة تصميم'],
      ['product_life', 'العمر الافتراضي للمنتج أقل من المطلوب']
    ]
  }, {
    id: 'automation',
    name: 'التحكم الآلي والرقمنة والقياس',
    discipline: ['control_automation', 'digital_manufacturing'],
    items: [
      ['sensor', 'حساسات أو قراءات غير مستقرة'],
      ['plc', 'نظام التحكم أو الـPLC يتصرف بشكل غير متوقع'],
      ['manual', 'العمل اليدوي يسبب بطئا أو اختلاف نتائج'],
      ['untracked', 'لا توجد بيانات كافية لمتابعة أداء الخط'],
      ['systems_integration', 'الماكينات أو الأنظمة لا تتبادل البيانات'],
      ['traceability', 'صعوبة تتبع الخامات والدفعات'],
      ['robotics', 'نحتاج أتمتة خطوة متكررة أو خطرة'],
      ['machine_monitor', 'لا نستطيع اكتشاف الأعطال قبل وقوعها']
    ]
  }, {
    id: 'lab',
    name: 'المعامل والاختبارات الفنية',
    discipline: ['laboratory_testing', 'metrology'],
    items: [
      ['need_testing', 'محتاجين تحليلا أو اختبارا غير متاح'],
      ['test_method', 'غير متأكدين من طريقة الاختبار المناسبة'],
      ['calibration', 'قراءات الأجهزة تحتاج تحققا أو معايرة'],
      ['validation', 'نحتاج التأكد من صلاحية منتج أو خامة'],
      ['material_characterization', 'نحتاج قياس خواص مادة أو سطح'],
      ['microbiological', 'نحتاج اختبارا ميكروبيولوجيا أو فحص تلوث'],
      ['product_compliance', 'نحتاج التحقق من مطابقة مواصفات فنية']
    ]
  }, {
    id: 'environment',
    name: 'المياه والصرف والمخلفات وكفاءة الموارد',
    discipline: ['environmental_engineering', 'chemical_engineering'],
    items: [
      ['waste_high', 'مخلفات التصنيع أكثر من المتوقع'],
      ['waste_use', 'نبحث عن طريقة لاستغلال المخلفات'],
      ['effluent', 'خصائص الصرف الصناعي تحتاج تحسينا'],
      ['emissions', 'انبعاثات أو روائح غير مرغوبة'],
      ['water_consumption', 'استهلاك المياه مرتفع'],
      ['heat_recovery', 'حرارة أو طاقة مهدرة يمكن استرجاعها'],
      ['recycling', 'خامة أو منتج يصعب إعادة تدويره']
    ]
  }, {
    id: 'storage',
    name: 'التخزين والتداول واللوجستيات الفنية',
    discipline: ['industrial_engineering', 'packaging_engineering'],
    items: [
      ['storage_damage', 'الخامات أو المنتجات تتلف في المخزن'],
      ['handling_damage', 'التلف يحدث أثناء النقل الداخلي أو المناولة'],
      ['inventory_loss', 'فاقد أو اختلاف في الكميات أثناء التخزين'],
      ['cold_chain', 'درجات الحرارة في التخزين أو النقل غير ثابتة'],
      ['packing_efficiency', 'التعبئة أو التحميل بطيئان أو بهما فاقد'],
      ['supply_technical', 'مكون فني يصعب توفيره بالمواصفات المطلوبة']
    ]
  }, {
    id: 'safety',
    name: 'السلامة الفنية وبيئة التشغيل',
    discipline: ['safety_engineering', 'mechanical_engineering'],
    items: [
      ['unsafe_machine', 'حركة ماكينة أو جزء مكشوف يسبب خطرا'],
      ['heat_hazard', 'حرارة غير طبيعية أو خطر حريق'],
      ['chemical_leak', 'تسرب أو تعرض لمادة خطرة'],
      ['dust_fumes', 'أتربة أو أبخرة تؤثر على بيئة التشغيل'],
      ['ergonomics', 'مهمة يدوية مرهقة أو متكررة تسبب إصابات'],
      ['noise', 'ضوضاء أو اهتزاز شديد']
    ]
  }, {
    id: 'skills',
    name: 'الخبرة الفنية وإجراءات التشغيل',
    discipline: ['industrial_engineering', 'technical_training'],
    items: [
      ['skills_gap', 'الخط يحتاج مهارة فنية غير متوفرة'],
      ['operator_variation', 'نتائج التشغيل تختلف حسب العامل'],
      ['no_standard', 'لا توجد طريقة تشغيل ثابتة ومكتوبة'],
      ['training_equipment', 'نحتاج تدريبا عمليا على ماكينة أو تقنية'],
      ['new_process', 'صعوبة تشغيل عملية أو تقنية جديدة']
    ]
  }, {
    id: 'unclear',
    name: 'مش قادر أحدد الجزء المتأثر',
    discipline: ['initial_triage'],
    items: [
      ['unclear_symptom', 'فيه تغيير أو مشكلة لكن السبب والمجال مش واضحين']
    ]
  }];
  const PROBES = {
    production: {
      q: 'فين بيظهر ضعف الأداء بشكل أساسي؟',
      opts: ['على خط إنتاج كامل', 'في مرحلة أو محطة محددة', 'على ماكينة محددة',
        'يختلف بين المنتجات أو الورديات'
      ]
    },
    machines: {
      q: 'أكثر شيء واضح في أداء المعدة؟',
      opts: ['توقف أو عطل مفاجئ', 'دقة أو جودة تشغيل أقل', 'سخونة أو اهتزاز أو ضوضاء',
        'العطل يتكرر بعد الإصلاح', 'صعوبة توفير جزء أو صيانته'
      ]
    },
    electric: {
      q: 'التأثير الكهربائي بيظهر فين؟',
      opts: ['كل المصنع', 'خط إنتاج أو قسم', 'ماكينة أو موتور محدد', 'وقت تشغيل معدات معينة']
    },
    utilities: {
      q: 'المرفق المتأثر غالبا؟',
      opts: ['مياه', 'غاز أو وقود', 'هواء مضغوط', 'بخار', 'تبريد أو تسخين']
    },
    materials: {
      q: 'في أي مرحلة تظهر مشكلة الخامة؟',
      opts: ['عند الاستلام أو الاختبار', 'أثناء الخلط أو المعالجة', 'أثناء التصنيع',
        'بعد التصنيع أو أثناء التخزين'
      ]
    },
    quality: {
      q: 'في أي وقت يظهر عيب الجودة؟',
      opts: ['خلال الإنتاج', 'عند اختبار المنتج', 'بعد التعبئة أو التخزين', 'بعد وصوله للعميل']
    },
    design: {
      q: 'ما الجزء المرتبط بتحدي التصميم؟',
      opts: ['وظيفة المنتج', 'الشكل والأبعاد', 'المكونات والتجميع', 'العبوة والتغليف',
        'التجربة والنموذج الأولي'
      ]
    },
    automation: {
      q: 'ما وضع العملية حاليا؟',
      opts: ['يدوية في أغلبها', 'آلية لكن التحكم غير مستقر', 'الماكينات تعمل ولا توجد متابعة بيانات',
        'توجد أنظمة منفصلة غير مترابطة'
      ]
    },
    lab: {
      q: 'ما نوع النتيجة المعملية المطلوبة؟',
      opts: ['تركيب أو تحليل كيميائي', 'خواص ميكانيكية أو فيزيائية', 'قياس أبعاد أو معايرة',
        'ميكروبيولوجي أو تلوث', 'اختبار أداء أو عمر افتراضي'
      ]
    },
    environment: {
      q: 'أين تظهر المشكلة البيئية أو فاقد الموارد؟',
      opts: ['صرف صناعي ومياه', 'مخلفات صلبة', 'انبعاثات وروائح', 'استهلاك موارد أو طاقة',
        'مشكلة إعادة تدوير'
      ]
    },
    storage: {
      q: 'متى أو أين يحدث التأثر؟',
      opts: ['أثناء التخزين', 'أثناء النقل داخل المصنع', 'أثناء التعبئة والتحميل',
        'أثناء التوريد من المورد'
      ]
    },
    safety: {
      q: 'أين توجد المخاطرة الرئيسية؟',
      opts: ['معدات أو حركة ميكانيكية', 'كهرباء أو حرارة', 'كيماويات أو غازات', 'أتربة أو ضوضاء',
        'طريقة أداء المهمة'
      ]
    },
    skills: {
      q: 'أين تظهر فجوة المهارات أو التشغيل؟',
      opts: ['تشغيل ماكينة أو خط', 'ضبط الجودة', 'الصيانة الفنية', 'تطبيق تقنية جديدة',
        'إجراءات تشغيل غير موحدة'
      ]
    },
    unclear: {
      q: 'إيه العلامة اللي خلتك تحس إن في مشكلة؟',
      opts: ['نتيجة الإنتاج تغيرت', 'جودة المنتجات تغيرت', 'التكاليف أو الاستهلاك زادت',
        'شكاوى أو ملاحظات من فريق العمل أو العملاء', 'مشكلة بتظهر في أكثر من جزء'
      ]
    }
  };
  const SPECIAL_PROBES = {
    low_output: {
      q: 'شكل انخفاض الإنتاج أقرب لإيه؟',
      opts: ['الخط يعمل لكن الناتج أقل', 'توقفات قصيرة متكررة', 'تكدس أو انتظار بين المراحل',
        'زيادة فاقد أو إعادة تشغيل'
      ]
    },
    power_outage: {
      q: 'الانقطاع بيأثر على إيه؟',
      opts: ['كل المصنع', 'خط أو منطقة محددة', 'ماكينة واحدة أو مجموعة صغيرة',
        'المشكلة مرتبطة بوقت تشغيل أحمال معينة'
      ]
    },
    voltage: {
      q: 'إيه اللي بتلاحظه وقت المشكلة؟',
      opts: ['إضاءة تضعف أو تومض', 'ماكينة تفصل وترجع تشتغل', 'موتورات تسخن أو أداؤها يتغير',
        'قراءة جهد تتغير'
      ]
    },
    energy_spike: {
      q: 'الاستهلاك زاد إمتى؟',
      opts: ['بالتدريج', 'بعد إضافة معدة جديدة', 'مع تشغيل خطوط معينة', 'بشكل مفاجئ']
    },
    raw_variability: {
      q: 'إيه اللي بيتغير بين دفعات الخام؟',
      opts: ['اللون أو الشكل', 'التركيب أو النقاوة', 'القوة أو المرونة', 'الرطوبة أو اللزوجة',
        'أداء الخام في التشغيل'
      ]
    },
    reject_rate: {
      q: 'نوع العيب الأكثر تكرارا؟',
      opts: ['أبعاد غير صحيحة', 'شكل أو لون أو سطح غير مطابق', 'ضعف في الأداء أو المتانة',
        'تلوث أو شوائب', 'عيوب مختلفة غير متشابهة'
      ]
    },
    unclear_symptom: {
      q: 'إيه أول حاجة لاحظت إنها اتغيرت؟',
      opts: ['معدل الإنتاج', 'جودة المنتج', 'الأعطال والتوقفات', 'استهلاك المواد أو الطاقة',
        'ملاحظات العملاء أو العاملين'
      ]
    }
  };
  // Unlike reactive challenges, improvements are expressed as positive opportunities, not failure symptoms.
  const IMPROVE_AREAS = [{
    id: 'production',
    name: 'الإنتاج وكفاءة العمليات',
    discipline: ['industrial_engineering', 'manufacturing_process'],
    items: [
      ['raise_throughput', 'زيادة الطاقة الإنتاجية أو عدد الوحدات'],
      ['shorter_cycle', 'تقليل زمن دورة التصنيع'],
      ['reduce_setup', 'تقليل وقت تغيير المنتج وإعداد الخط'],
      ['balance_flow', 'تحسين انسياب الإنتاج بين المراحل'],
      ['better_planning', 'تحسين تخطيط وجدولة التشغيل']
    ]
  }, {
    id: 'machines',
    name: 'تطوير أداء المعدات',
    discipline: ['mechanical_engineering', 'maintenance'],
    items: [
      ['upgrade_machine', 'تحديث ماكينة أو رفع كفاءتها'],
      ['increase_reliability', 'زيادة اعتمادية المعدات'],
      ['predictive_maintenance', 'تطوير الصيانة الاستباقية'],
      ['improve_precision', 'رفع دقة تشغيل الماكينة']
    ]
  }, {
    id: 'electric',
    name: 'كفاءة الطاقة والكهرباء',
    discipline: ['electrical_engineering', 'energy_systems'],
    items: [
      ['save_power', 'خفض استهلاك الكهرباء'],
      ['better_load', 'تحسين إدارة الأحمال'],
      ['power_quality', 'تحسين استقرار التغذية للمعدات'],
      ['energy_monitor', 'تركيب قياس ومتابعة ذكية للطاقة']
    ]
  }, {
    id: 'utilities',
    name: 'المياه والهواء والتبريد والحرارة',
    discipline: ['thermal_engineering', 'mechanical_engineering'],
    items: [
      ['water_efficiency', 'ترشيد المياه في التشغيل'],
      ['cooling_efficiency', 'رفع كفاءة التبريد'],
      ['heat_recovery', 'استرجاع الحرارة المهدرة'],
      ['compressed_air', 'رفع كفاءة الهواء المضغوط']
    ]
  }, {
    id: 'materials',
    name: 'تطوير الخامات والتركيبات',
    discipline: ['materials_science', 'chemical_engineering'],
    items: [
      ['improve_formulation', 'تحسين تركيبة منتج أو خامة'],
      ['material_substitute', 'تجربة خامة بديلة'],
      ['increase_yield', 'رفع كفاءة استخدام الخامة'],
      ['material_properties', 'تحسين خواص مادة']
    ]
  }, {
    id: 'quality',
    name: 'رفع جودة المنتج',
    discipline: ['quality_engineering', 'metrology'],
    items: [
      ['stable_quality', 'زيادة ثبات الجودة بين الدفعات'],
      ['reduce_rejects', 'خفض نسبة المنتجات المرفوضة'],
      ['process_control', 'تطوير ضبط الجودة أثناء التصنيع'],
      ['improve_testing', 'تحسين أسلوب اختبار الجودة']
    ]
  }, {
    id: 'design',
    name: 'تصميم وتطوير المنتجات والتغليف',
    discipline: ['product_design', 'materials_science'],
    items: [
      ['redesign_product', 'إعادة تصميم منتج قائم'],
      ['lighter_product', 'تقليل وزن المنتج دون فقد الأداء'],
      ['better_package', 'تحسين العبوة والحماية'],
      ['better_assembly', 'تسهيل تجميع المكونات']
    ]
  }, {
    id: 'automation',
    name: 'الأتمتة والتحكم والرقمنة',
    discipline: ['control_automation', 'digital_manufacturing'],
    items: [
      ['automatic_line', 'أتمتة مرحلة من الإنتاج'],
      ['monitor_process', 'متابعة الماكينات والبيانات لحظيا'],
      ['robot_assist', 'استخدام نظام آلي في المناولة'],
      ['connect_systems', 'ربط المعدات والأنظمة'],
      ['smart_sensors', 'تطوير القياسات والتحكم الذكي']
    ]
  }, {
    id: 'lab',
    name: 'تطوير القياس والاختبارات',
    discipline: ['laboratory_testing', 'metrology'],
    items: [
      ['faster_test', 'تقليل زمن الاختبارات'],
      ['new_test', 'تطوير أسلوب اختبار جديد'],
      ['better_calibration', 'رفع دقة القياس والمعايرة']
    ]
  }, {
    id: 'environment',
    name: 'كفاءة الموارد والاستدامة',
    discipline: ['environmental_engineering', 'chemical_engineering'],
    items: [
      ['waste_recovery', 'تحويل المخلفات إلى منتج نافع'],
      ['reduce_emissions', 'خفض الانبعاثات'],
      ['reuse_water', 'إعادة استخدام المياه'],
      ['circular_materials', 'تدوير أو إعادة استخدام المواد']
    ]
  }, {
    id: 'storage',
    name: 'تحسين التخزين والمناولة',
    discipline: ['industrial_engineering', 'packaging_engineering'],
    items: [
      ['better_handling', 'رفع كفاءة المناولة الداخلية'],
      ['better_storage', 'تحسين ظروف التخزين'],
      ['less_damage', 'تقليل التلف أثناء النقل الداخلي']
    ]
  }, {
    id: 'safety',
    name: 'رفع مستوى السلامة',
    discipline: ['safety_engineering', 'mechanical_engineering'],
    items: [
      ['safer_machinery', 'زيادة أمان الماكينات'],
      ['safer_chemical_use', 'تحسين التعامل مع المواد الخطرة'],
      ['ergonomic_design', 'تقليل الإجهاد البدني للعاملين']
    ]
  }, {
    id: 'skills',
    name: 'تطوير التشغيل والمهارات الفنية',
    discipline: ['industrial_engineering', 'technical_training'],
    items: [
      ['standardize_methods', 'توحيد أساليب التشغيل'],
      ['technical_training', 'رفع مهارات فريق التشغيل'],
      ['knowledge_transfer', 'نقل معرفة تقنية جديدة']
    ]
  }];
  const IMPROVE_PROBES = {
    production: {
      q: 'أين سينفذ التحسين؟',
      opts: ['خط إنتاج كامل', 'مرحلة في الخط', 'ماكينة محددة', 'التخطيط بين عدة خطوط']
    },
    machines: {
      q: 'نوع المعدة المستهدفة',
      opts: ['ماكينة تصنيع', 'معدات مناولة', 'مضخات أو ضواغط', 'معدات أخرى']
    },
    electric: {
      q: 'ما الجزء المستهدف؟',
      opts: ['استهلاك المعدات', 'التغذية الكهربائية', 'نظام مراقبة الطاقة', 'أحمال ومواعيد التشغيل']
    },
    utilities: {
      q: 'ما المرفق المستهدف؟',
      opts: ['المياه', 'الهواء المضغوط', 'التبريد', 'التسخين أو البخار']
    },
    materials: {
      q: 'ما نوع الخامة الأقرب؟',
      opts: ['معادن', 'بوليمرات أو بلاستيك', 'كيماويات أو تركيبات', 'مواد غذائية', 'مواد أخرى']
    },
    quality: {
      q: 'أين ستظهر فائدة التحسين؟',
      opts: ['جودة خامات الداخل', 'أثناء التصنيع', 'الفحص النهائي', 'المنتج لدى العميل']
    },
    design: {
      q: 'التحسين يخص؟',
      opts: ['منتج نهائي', 'جزء أو مكون', 'العبوة', 'طريقة التجميع']
    },
    automation: {
      q: 'أين تريد تطبيق الحل؟',
      opts: ['على ماكينة', 'على خط إنتاج', 'في قياس ومراقبة البيانات', 'بين عدة أنظمة']
    },
    lab: {
      q: 'ما الذي تود تحسينه؟',
      opts: ['دقة القياس', 'سرعة الفحص', 'طريقة اختبار جديدة', 'توثيق النتائج']
    },
    environment: {
      q: 'أي مورد أو أثر تريد تحسينه؟',
      opts: ['المياه', 'المواد الخام', 'الطاقة', 'المخلفات والانبعاثات']
    },
    storage: {
      q: 'موضع التحسين',
      opts: ['المخزن', 'النقل الداخلي', 'التحميل والتفريغ', 'التعبئة']
    },
    safety: {
      q: 'نطاق التحسين',
      opts: ['الماكينات', 'المواد الكيميائية', 'موقع العمل', 'المهام اليدوية']
    },
    skills: {
      q: 'المجال المستهدف',
      opts: ['تشغيل المعدات', 'الصيانة', 'الجودة', 'تقنية جديدة']
    }
  };
  // Separate current negative effects from future positive outcomes.
  const IMPACT = [
    ['production', 'انخفاض الإنتاج'],
    ['downtime', 'توقف أو تعطيل التشغيل'],
    ['quality', 'انخفاض الجودة'],
    ['cost', 'ارتفاع تكلفة التشغيل'],
    ['waste', 'زيادة الهالك أو المخلفات'],
    ['safety', 'مخاطر على السلامة'],
    ['delivery', 'تأخير التسليم'],
    ['resources', 'زيادة استهلاك الموارد']
  ];
  const BENEFITS = {
    improve: [
      ['production_up', 'زيادة الإنتاجية'],
      ['downtime_down', 'تقليل الأعطال والتوقفات'],
      ['quality_up', 'تحسين الجودة وثبات النتائج'],
      ['cost_down', 'خفض تكلفة التشغيل'],
      ['waste_down', 'تقليل الهالك'],
      ['resources_down', 'خفض استهلاك الطاقة أو الخامات'],
      ['safety_up', 'تحسين السلامة'],
      ['speed_up', 'تقليل زمن العملية'],
      ['automation_up', 'تقليل الأعمال اليدوية'],
      ['capacity_up', 'زيادة الطاقة الإنتاجية']
    ],
    idea: [
      ['new_product', 'تطوير منتج جديد'],
      ['product_upgrade', 'تحسين منتج قائم'],
      ['productivity_up', 'رفع كفاءة التشغيل'],
      ['quality_up', 'تحسين الجودة أو الأداء'],
      ['cost_down', 'خفض التكلفة'],
      ['waste_down', 'تقليل الهالك'],
      ['resources_down', 'ترشيد الطاقة والموارد'],
      ['automation', 'زيادة الأتمتة ودقة التحكم'],
      ['safety_up', 'تحسين السلامة'],
      ['new_market', 'فتح تطبيق أو سوق جديد'],
      ['environment', 'تقليل الأثر البيئي']
    ],
    localize: [
      ['import_dependency', 'تقليل الاعتماد على الاستيراد'],
      ['local_availability', 'توفير المكون أو الخامة محليا'],
      ['lead_time', 'تقليل مدة التوريد'],
      ['cost_down', 'خفض تكلفة الشراء أو التشغيل'],
      ['quality_match', 'توفير بديل محلي بنفس المواصفات'],
      ['customization', 'تطوير بديل يلائم احتياجات المصنع'],
      ['supply_stability', 'تحسين استقرار التوريد'],
      ['local_design', 'بناء قدرة تصنيع أو تصميم محلي']
    ]
  };
  const GOALS = [
    ['diagnose', 'تحديد السبب والبدائل الفنية المناسبة'],
    ['productivity', 'زيادة الإنتاجية'],
    ['reliability', 'تقليل الأعطال والتوقف'],
    ['quality', 'رفع الجودة وثبات المنتج'],
    ['cost', 'خفض التكلفة أو الاستهلاك'],
    ['prototype', 'تصميم أو تجربة نموذج أولي'],
    ['local', 'تطوير أو تصنيع بديل محلي'],
    ['lab', 'إجراء اختبار والتحقق من النتيجة'],
    ['environment', 'خفض الهالك أو الانبعاثات'],
    ['safety', 'تحسين السلامة']
  ];
  const OUTCOMES = {
    challenge: [
      ['diagnose', 'تحديد سبب المشكلة ووضع حل مناسب'],
      ['fix', 'حل المشكلة ومنع تكرارها'],
      ['productivity', 'استعادة الإنتاج للمستوى المطلوب'],
      ['reliability', 'تقليل الأعطال والتوقف'],
      ['quality', 'استعادة جودة المنتج'],
      ['cost', 'خفض التكلفة أو الفاقد'],
      ['safety', 'إزالة أو تقليل الخطر']
    ],
    improve: [
      ['productivity', 'رفع كمية الإنتاج أو سرعة الخط'],
      ['reliability', 'رفع استقرار التشغيل'],
      ['quality', 'تحسين الجودة'],
      ['cost', 'خفض التكلفة أو استهلاك الموارد'],
      ['prototype', 'تنفيذ وتحقيق جدوى تطوير العملية'],
      ['safety', 'تحسين السلامة'],
      ['automation', 'تطبيق أتمتة أو قياس أدق']
    ],
    idea: [
      ['prototype', 'تطوير نموذج أولي وتجربته'],
      ['feasibility', 'دراسة الجدوى الفنية للفكرة'],
      ['product', 'تطوير منتج أو خامة قابلة للاستخدام'],
      ['process', 'تطوير طريقة تصنيع جديدة'],
      ['automation', 'تنفيذ نظام تحكم أو رقمنة'],
      ['testing', 'التحقق من أداء الفكرة بالاختبارات']
    ],
    localize: [
      ['feasibility', 'دراسة إمكانية التصنيع محليا'],
      ['prototype', 'تصميم أو تصنيع نموذج أولي'],
      ['local', 'إنتاج بديل محلي مطابق للاحتياج'],
      ['validation', 'اختبار البديل المحلي ومقارنته بالمستورد'],
      ['scale', 'تجهيز خطوات الإنتاج المحلي على نطاق صناعي']
    ]
  };
  const CURRENT_METRICS = [
    ['lost_hours', 'ساعات التوقف الحالية', 'ساعة / شهر'],
    ['output', 'معدل الإنتاج الحالي', 'وحدة / فترة'],
    ['reject', 'نسبة الرفض أو العيوب الحالية', '%'],
    ['energy', 'استهلاك الكهرباء الحالي', 'kWh / شهر'],
    ['extra_cost', 'تكلفة إضافية حالية', 'جنيه / شهر'],
    ['waste', 'كمية الهالك الحالية', 'كجم / شهر'],
    ['lead_time', 'زمن العملية الحالي', 'دقيقة']
  ];
  const TARGET_METRICS = [
    ['target_output_gain', 'زيادة إنتاج مستهدفة', '%'],
    ['target_cost_saving', 'توفير مستهدف في التكلفة', 'جنيه / شهر'],
    ['target_waste_reduction', 'خفض مستهدف للهالك', '%'],
    ['target_energy_saving', 'خفض مستهدف لاستهلاك الطاقة', '%'],
    ['target_downtime_reduction', 'خفض مستهدف للتوقفات', 'ساعة / شهر'],
    ['target_time_reduction', 'خفض مستهدف لزمن العملية', '%'],
    ['target_local_share', 'نسبة توطين مستهدفة', '%']
  ];
  // Unit + time period are separate analytical fields, never one unstructured label.
  const METRIC_SETTINGS = {
    lost_hours: {
      unit: 'ساعة',
      period: 'شهر',
      units: ['ساعة'],
      periods: ['يوم', 'أسبوع', 'شهر']
    },
    output: {
      unit: 'قطعة',
      period: 'يوم',
      units: ['قطعة', 'طن', 'كجم', 'لتر', 'متر', 'عبوة', 'وحدة أخرى'],
      periods: ['ساعة', 'وردية', 'يوم', 'أسبوع', 'شهر']
    },
    reject: {
      unit: '%',
      period: '',
      units: ['%'],
      periods: []
    },
    energy: {
      unit: 'kWh',
      period: 'شهر',
      units: ['kWh', 'MWh'],
      periods: ['يوم', 'أسبوع', 'شهر']
    },
    extra_cost: {
      unit: 'جنيه',
      period: 'شهر',
      units: ['جنيه'],
      periods: ['أسبوع', 'شهر']
    },
    waste: {
      unit: 'كجم',
      period: 'شهر',
      units: ['كجم', 'طن', 'قطعة', 'لتر'],
      periods: ['يوم', 'أسبوع', 'شهر']
    },
    lead_time: {
      unit: 'دقيقة',
      period: '',
      units: ['دقيقة', 'ساعة', 'يوم'],
      periods: []
    },
    target_output_gain: {
      unit: '%',
      period: '',
      units: ['%'],
      periods: []
    },
    target_cost_saving: {
      unit: 'جنيه',
      period: 'شهر',
      units: ['جنيه'],
      periods: ['شهر', 'سنة']
    },
    target_waste_reduction: {
      unit: '%',
      period: '',
      units: ['%'],
      periods: []
    },
    target_energy_saving: {
      unit: '%',
      period: '',
      units: ['%'],
      periods: []
    },
    target_downtime_reduction: {
      unit: 'ساعة',
      period: 'شهر',
      units: ['ساعة'],
      periods: ['أسبوع', 'شهر']
    },
    target_time_reduction: {
      unit: '%',
      period: '',
      units: ['%'],
      periods: []
    },
    target_local_share: {
      unit: '%',
      period: '',
      units: ['%'],
      periods: []
    }
  };
  const metricCfg = () => METRIC_SETTINGS[state.metricType] || {
    unit: '',
    period: '',
    units: [],
    periods: []
  };
  const metricOptions = () => state.kind === 'challenge' ? CURRENT_METRICS : TARGET_METRICS;
  const effectOptions = () => state.kind === 'challenge' ? IMPACT : (BENEFITS[state.kind] || []);
  const outcomeOptions = () => OUTCOMES[state.kind] || GOALS;

  const TYPES = [
    ['challenge', 'عندي تحد فني أو مشكلة', 'حالة موجودة تؤثر على التشغيل أو المنتج', '⚙'],
    ['improve', 'عايز أحسن حاجة في المصنع', 'تطوير استباقي حتى لو مفيش عطل حاليا', '↗'],
    ['idea', 'عندي فكرة منتج أو تطوير', 'فكرة جديدة تحتاج دراسة أو تجربة', '✦'],
    ['localize', 'عايز أصنع بديلا مستوردا', 'منتج أو مكون أو خامة ممكن تصنيعها محليا', '▣'],
    ['lab', 'محتاج فحصا أو اختبارا', 'اختبار أو قياس أو تحقق من خواص منتج', '⚗']
  ];
  const OPPORTUNITY = {
    idea: {
      q: 'الفكرة أقرب لأنهي نوع؟',
      opts: [
        ['new_product', 'منتج جديد'],
        ['improved_product', 'تحسين منتج موجود'],
        ['new_process', 'طريقة تصنيع أو عملية جديدة'],
        ['new_machine', 'تطوير ماكينة أو أداة'],
        ['material_innovation', 'تطوير خامة أو تركيبة'],
        ['digital_solution', 'حل تحكم أو رقمنة'],
        ['recycle_innovation', 'استفادة مبتكرة من المخلفات']
      ]
    },
    localize: {
      q: 'إيه اللي عايز تصنعه محليا؟',
      opts: [
        ['import_part', 'قطعة غيار أو مكون'],
        ['import_material', 'خامة أو مادة كيميائية'],
        ['import_machine', 'ماكينة أو معدة'],
        ['import_product', 'منتج نهائي'],
        ['import_electronics', 'دائرة أو مكون إلكتروني'],
        ['import_pack', 'عبوة أو مادة تغليف']
      ]
    },
    lab: {
      q: 'نوع الاختبار المطلوب؟',
      opts: [
        ['chemical_test', 'تحليل كيميائي أو تركيب'],
        ['mechanical_test', 'اختبار قوة أو متانة'],
        ['thermal_test', 'اختبار حرارة أو تبريد'],
        ['electrical_test', 'قياس أو اختبار كهربائي'],
        ['microbial_test', 'اختبار ميكروبيولوجي'],
        ['physical_test', 'قياس خواص فيزيائية'],
        ['standard_test', 'تقييم أداء أو مطابقة مواصفة']
      ]
    }
  };

  // TAXONOMY: grouped for user navigation. Inspired by ISO ICS subject fields & ASTM testing families;
  // labels/IDs are prototype application taxonomy, not official test-method or accreditation codes.
  const LAB_AREAS = [
    ['chemical', 'التحاليل الكيميائية وتركيب المواد', [
      ['composition', 'تحليل العناصر أو التركيب الكيميائي'],
      ['purity', 'قياس النقاوة والشوائب'],
      ['concentration', 'تحديد تركيز مادة أو مكون'],
      ['heavy_metals', 'قياس المعادن الثقيلة'],
      ['organic', 'تحليل مركبات عضوية'],
      ['ph_acidity', 'قياس الحموضة أو القلوية'],
      ['unknown_identification', 'التعرف على مادة مجهولة']
    ]],
    ['mechanical', 'القوة والمتانة والاختبارات الميكانيكية', [
      ['tensile', 'اختبار الشد'],
      ['compression', 'اختبار الضغط'],
      ['hardness', 'اختبار الصلادة'],
      ['impact', 'اختبار الصدمات'],
      ['bending', 'اختبار الانحناء'],
      ['fatigue', 'اختبار الكلل أو الأحمال المتكررة'],
      ['wear', 'مقاومة التآكل والاحتكاك'],
      ['load', 'اختبار تحمل الأحمال']
    ]],
    ['thermal', 'الاختبارات الحرارية', [
      ['heat_resistance', 'مقاومة درجات الحرارة المرتفعة'],
      ['thermal_stability', 'الثبات الحراري'],
      ['conductivity', 'التوصيل الحراري'],
      ['thermal_expansion', 'التمدد الحراري'],
      ['flame', 'سلوك الاشتعال والحريق'],
      ['cooling', 'أداء التبريد والعزل']
    ]],
    ['electrical', 'الاختبارات الكهربائية والإلكترونية', [
      ['insulation', 'اختبار العزل الكهربائي'],
      ['dielectric', 'تحمل الجهد الكهربائي'],
      ['resistance', 'قياس المقاومة أو الموصلية'],
      ['motor', 'اختبار أداء محرك كهربائي'],
      ['electronics', 'اختبار مكونات إلكترونية'],
      ['grounding', 'فحص التأريض'],
      ['battery', 'اختبار بطارية أو وحدة تخزين']
    ]],
    ['physical', 'الخواص الفيزيائية', [
      ['density', 'قياس الكثافة'],
      ['viscosity', 'قياس اللزوجة'],
      ['porosity', 'قياس المسامية'],
      ['dimensions', 'الأبعاد والسمك'],
      ['moisture', 'قياس الرطوبة'],
      ['surface', 'خواص السطح والملمس'],
      ['optical', 'اللون والخواص البصرية']
    ]],
    ['microbiology', 'التحاليل الميكروبيولوجية', [
      ['micro_count', 'العد الميكروبي'],
      ['bacteria', 'الكشف عن بكتيريا محددة'],
      ['mold', 'الفطريات والخمائر'],
      ['sterility', 'اختبار التعقيم'],
      ['hygiene', 'اختبار النظافة والتلوث']
    ]],
    ['metallurgy', 'المعادن والبنية المجهرية', [
      ['alloy', 'تحليل تركيب سبيكة'],
      ['microstructure', 'فحص البنية المجهرية'],
      ['corrosion', 'اختبار التآكل الكيميائي'],
      ['heat_treatment', 'فحص المعالجة الحرارية'],
      ['coating_thickness', 'قياس سمك الطلاء المعدني']
    ]],
    ['ndt', 'الفحص غير الإتلافي', [
      ['ultrasonic', 'فحص بالموجات فوق الصوتية'],
      ['radiography', 'فحص بالأشعة'],
      ['magnetic', 'فحص جسيمات مغناطيسية'],
      ['penetrant', 'فحص سوائل متغلغلة'],
      ['visual', 'فحص بصري صناعي']
    ]],
    ['environment', 'التحاليل البيئية والمياه', [
      ['water', 'تحليل مياه عملية الإنتاج'],
      ['wastewater', 'تحليل صرف صناعي'],
      ['emissions', 'قياس انبعاثات'],
      ['waste', 'تحليل مخلفات صناعية'],
      ['air', 'قياس جودة الهواء']
    ]],
    ['packaging', 'التغليف والعبوات', [
      ['burst', 'تحمل الضغط أو الانفجار'],
      ['seal', 'سلامة اللحام أو الغلق'],
      ['barrier', 'نفاذية الأكسجين أو الرطوبة'],
      ['drop', 'اختبار السقوط'],
      ['compression_pack', 'الضغط على العبوات'],
      ['migration', 'هجرة مواد من العبوة إلى المحتوى']
    ]],
    ['textiles', 'النسيج والجلود', [
      ['fabric_tensile', 'متانة شد النسيج'],
      ['colorfast', 'ثبات الألوان'],
      ['abrasion', 'مقاومة الاحتكاك'],
      ['shrinkage', 'الانكماش'],
      ['fiber', 'تركيب الألياف'],
      ['waterproof', 'مقاومة الماء']
    ]],
    ['food', 'الأغذية والمنتجات الحيوية', [
      ['nutrients', 'التركيب الغذائي'],
      ['shelf_life', 'الثبات والعمر التخزيني'],
      ['food_safety', 'ملوثات الغذاء'],
      ['fat_moisture', 'دهون أو رطوبة أو بروتين'],
      ['sensory', 'تقييم الخواص الحسية']
    ]],
    ['calibration', 'المعايرة والقياسات', [
      ['temp_cal', 'معايرة الحرارة'],
      ['pressure_cal', 'معايرة الضغط'],
      ['electrical_cal', 'معايرة كهربائية'],
      ['mass_cal', 'معايرة الكتلة والوزن'],
      ['length_cal', 'معايرة الأبعاد'],
      ['flow_cal', 'معايرة التدفق']
    ]],
    ['compliance', 'اختبارات الأداء والمطابقة', [
      ['performance', 'تقييم أداء المنتج'],
      ['reliability', 'اختبار الاعتمادية والعمر الافتراضي'],
      ['spec_compliance', 'اختبار مطابقة مواصفة'],
      ['prototype', 'اختبار نموذج أولي'],
      ['comparative', 'مقارنة أداء منتجين']
    ]],
    ['coatings', 'الدهانات والطلاءات والمواد اللاصقة', [
      ['adhesion', 'التصاق الطلاء أو اللاصق'],
      ['thickness_coat', 'سمك الطلاء'],
      ['weather', 'مقاومة العوامل الجوية'],
      ['chemical_resistance', 'مقاومة المواد الكيميائية'],
      ['drying', 'زمن الجفاف أو التصلب']
    ]]
  ];
  const LAB_GOALS = [
    ['composition', 'معرفة تركيب المادة أو المكونات'],
    ['strength', 'قياس قوة أو متانة منتج أو مكون'],
    ['thermal', 'قياس تحمل الحرارة أو التبريد'],
    ['electrical', 'التأكد من خواص كهربائية'],
    ['microbiology', 'التحقق من تلوث ميكروبي أو تعقيم'],
    ['physical', 'قياس خواص فيزيائية'],
    ['safety', 'التأكد من السلامة أو المطابقة'],
    ['performance', 'التحقق من أداء المنتج أو النموذج'],
    ['environment', 'قياس ملوثات أو خواص بيئية'],
    ['defects', 'البحث عن شروخ أو عيوب داخلية'],
    ['calibration', 'معايرة جهاز قياس']
  ];
  const LAB_GOAL_DETAILS = {
    composition: ['تحديد العناصر أو المكونات', 'قياس النقاوة أو الشوائب', 'معرفة تركيز مادة معينة',
      'تحديد مادة مجهولة', 'مقارنة خامتين مختلفتين'
    ],
    strength: ['مقاومة الشد', 'مقاومة الضغط', 'تحمل الصدمات', 'الصلادة أو الخدش', 'الانحناء',
      'الاهتزاز أو الأحمال المتكررة', 'تحمل حمل فعلي أثناء الاستخدام'
    ],
    thermal: ['مقاومة حرارة مرتفعة', 'ثبات الخواص مع الحرارة', 'العزل أو التوصيل الحراري',
      'التمدد أو الانكماش', 'التبريد والتجميد'
    ],
    electrical: ['العزل أو تحمل الجهد', 'المقاومة أو الموصلية', 'أداء محرك أو جهاز',
      'كفاءة مكون إلكتروني', 'السلامة والتأريض'
    ],
    microbiology: ['الكشف عن بكتيريا', 'الكشف عن فطريات أو خمائر', 'العد الميكروبي الإجمالي',
      'التحقق من التعقيم'
    ],
    physical: ['الكثافة', 'اللزوجة', 'الرطوبة', 'الأبعاد أو السمك', 'المسامية', 'اللون أو خواص السطح'],
    safety: ['مطابقة مواصفة منتج', 'اختبار مقاومة الحريق', 'سلامة كهربائية', 'سلامة ملامسة الغذاء',
      'تقييم سلامة الاستخدام'
    ],
    performance: ['قياس الأداء تحت ظروف التشغيل', 'اختبار العمر الافتراضي', 'مقارنة مع منتج موجود',
      'اختبار نموذج أولي'
    ],
    environment: ['تحليل مياه', 'تحليل صرف صناعي', 'قياس انبعاثات', 'تحليل مخلفات صناعية'],
    defects: ['كشف شروخ داخلية', 'عيوب لحام', 'مسامية داخلية', 'تغير غير طبيعي في البنية'],
    calibration: ['درجة الحرارة', 'الضغط', 'الوزن والكتلة', 'الجهد أو التيار', 'الطول أو الأبعاد',
      'التدفق'
    ]
  };
  const LAB_AREA_GOALS = {
    chemical: ['composition', 'physical', 'safety'],
    mechanical: ['strength', 'performance', 'safety'],
    thermal: ['thermal', 'safety', 'performance'],
    electrical: ['electrical', 'safety', 'performance'],
    physical: ['physical', 'composition'],
    microbiology: ['microbiology', 'safety'],
    metallurgy: ['composition', 'strength', 'defects'],
    ndt: ['defects', 'safety'],
    environment: ['environment', 'safety'],
    packaging: ['strength', 'physical', 'performance', 'safety'],
    textiles: ['strength', 'physical', 'performance'],
    food: ['composition', 'microbiology', 'safety'],
    calibration: ['calibration'],
    compliance: ['safety', 'performance'],
    coatings: ['physical', 'strength', 'performance']
  };
  const MATERIALS = {
    polymer: ['بولي إيثيلين (PE)', 'بولي بروبيلين (PP)', 'بولي إيثيلين تيريفثالات (PET)', 'PVC',
      'مطاط صناعي', 'بلاستيك هندسي آخر'
    ],
    metal: ['صلب أو حديد', 'ستانلس ستيل', 'ألومنيوم', 'نحاس أو سبائك نحاس', 'زنك أو معادن أخرى'],
    chemical: ['مذيب', 'حمض أو قاعدة', 'ملح أو مركب غير عضوي', 'زيوت أو مواد تشحيم',
      'مادة فعالة أو مضافة', 'خلطة أو تركيبة صناعية'
    ],
    ceramic: ['سيراميك', 'زجاج', 'أسمنت', 'حراريات', 'مسحوق معدني أو معدني غير فلزي'],
    composite: ['مركب مقوى بألياف زجاجية', 'مركب مقوى بألياف كربونية', 'مركب متعدد الطبقات',
      'مركب بوليمري آخر'
    ],
    textile: ['قطن', 'بوليستر', 'صوف', 'مزيج ألياف', 'جلد طبيعي أو صناعي'],
    food: ['مادة غذائية خام', 'مادة غذائية مصنعة', 'زيت غذائي', 'مضاف غذائي', 'مشروب أو سائل غذائي'],
    coating: ['دهان', 'طلاء معدني', 'مادة لاصقة', 'راتنج', 'حبر صناعي'],
    paper: ['ورق', 'كرتون', 'لب ورق', 'مادة تغليف ورقية'],
    water: ['مياه خام', 'مياه عمليات', 'مياه تبريد', 'صرف صناعي'],
    wood: ['خشب طبيعي', 'خشب صناعي', 'ألياف أو مادة نباتية'],
    other: ['مادة أخرى غير موجودة بالقائمة']
  };
  const MATERIAL_NAMES = {
    polymer: 'بلاستيك وبوليمرات ومطاط',
    metal: 'معادن وسبائك',
    chemical: 'كيماويات ومذيبات وتركيبات',
    ceramic: 'سيراميك وزجاج وأسمنت ومواد غير معدنية',
    composite: 'مواد مركبة',
    textile: 'ألياف ومنسوجات وجلود',
    food: 'مواد غذائية',
    coating: 'دهانات وطلاءات ومواد لاصقة',
    paper: 'ورق وكرتون',
    water: 'مياه وسوائل صناعية',
    wood: 'أخشاب ومواد نباتية',
    other: 'خامة أو مادة أخرى'
  };
  const PRODUCTS = {
    packaging: ['زجاجة أو عبوة بلاستيكية', 'عبوة معدنية', 'عبوة زجاجية', 'كيس أو فيلم تغليف',
      'كرتون أو صندوق', 'غطاء أو وسيلة إغلاق'
    ],
    mech: ['عمود أو محور', 'ترس', 'صمام أو مضخة', 'مسمار أو وصلة', 'قطعة غيار مصنعة', 'جزء من ماكينة'],
    electrical: ['كابل أو سلك', 'قاطع أو مفتاح', 'موتور كهربائي', 'لوحة تحكم',
      'حساس أو دائرة إلكترونية', 'بطارية'
    ],
    building: ['طوب أو بلوك', 'بلاط أو سيراميك', 'مواسير أو مواسير ضغط', 'لوح أو قطاع معدني',
      'مادة عزل', 'منتج خرساني'
    ],
    textiles: ['قماش أو نسيج', 'خيط أو حبل', 'ملابس أو منتج نهائي', 'جلد أو حذاء', 'منسوجات فنية'],
    food: ['غذاء معبأ', 'منتج مجمد', 'منتج مخبوز', 'منتج ألبان', 'منتج سائل'],
    plastic: ['صينية أو حاوية بلاستيكية', 'جزء بلاستيكي مصبوب', 'أنبوب بلاستيكي',
      'لوح أو فيلم بلاستيكي', 'جزء مطاطي'
    ],
    automotive: ['جزء سيارة معدني', 'جزء بلاستيكي للسيارات', 'جزء مطاطي', 'جزء كهربائي أو إلكتروني'],
    medical: ['مستهلك طبي', 'عبوة طبية', 'أداة طبية', 'مكون جهاز طبي'],
    chemicals: ['منتج كيماوي مصنع', 'دهان أو طلاء', 'منظف', 'مادة لاصقة'],
    machinery: ['ماكينة أو وحدة كاملة', 'هيكل ماكينة', 'معدات رفع', 'مبادل حراري', 'مضخة أو ضاغط'],
    paper: ['علبة كرتون', 'لوح خشب أو أثاث', 'منتج ورقي', 'عبوة ورقية'],
    other: ['منتج آخر غير موجود بالقائمة']
  };
  const PRODUCT_NAMES = {
    packaging: 'عبوات وتغليف',
    mech: 'أجزاء ميكانيكية ومكونات',
    electrical: 'منتجات ومكونات كهربائية',
    building: 'مواد ومنتجات البناء',
    textiles: 'منسوجات وملابس وجلود',
    food: 'منتجات غذائية',
    plastic: 'منتجات بلاستيكية أو مطاطية',
    automotive: 'مكونات سيارات ونقل',
    medical: 'منتجات ومستلزمات طبية',
    chemicals: 'منتجات كيماوية ودهانات',
    machinery: 'آلات ومعدات صناعية',
    paper: 'أخشاب وورق وأثاث',
    other: 'منتج آخر'
  };
  const LAB_USAGE = [
    ['product', 'تطوير منتج أو خامة'],
    ['supplier', 'التحقق من جودة مورد أو خامة'],
    ['quality', 'التحقق من جودة الإنتاج'],
    ['failure', 'فهم سبب عطل أو عيب'],
    ['standard', 'التحقق من مطابقة مواصفة'],
    ['research', 'دراسة أو مشروع بحثي'],
    ['localization', 'تقييم بديل محلي لمستورد']
  ];

  function labArea() {
    return LAB_AREAS.find(a => a[0] === state.labArea)
  }

  function labGoalLabel() {
    return label(LAB_GOALS, state.labGoal)
  }

  function labSubjectMode() {
    return state.labItemKind;
  }

  function labResetSubject() {
    state.labMaterialFamily = '';
    state.labMaterialType = '';
    state.labProductFamily = '';
    state.labProductType = '';
    state.labOtherName = ''
  }

  function labResetAll() {
    Object.assign(state, {
      labKnowledge: '',
      labArea: '',
      labTest: '',
      labCustomTest: '',
      labGoal: '',
      labDetail: '',
      labItemKind: '',
      labMaterialFamily: '',
      labMaterialType: '',
      labProductFamily: '',
      labProductType: '',
      labOtherName: '',
      labSampleNote: '',
      labStandard: '',
      labSpecCode: '',
      labUse: '',
      labSampleCount: ''
    });
  }

  function labSubjectFields() {
    let m = labSubjectMode(),
      h = '';
    if (m === 'material') {
      h +=
        `<div class="two">${field('labMaterialFamily','ما عائلة المادة أو الخامة؟',opts('labMaterialFamily',Object.entries(MATERIAL_NAMES),state.labMaterialFamily),true)}${state.labMaterialFamily?field('labMaterialType','ما نوع المادة الأقرب؟',opts('labMaterialType',(MATERIALS[state.labMaterialFamily]||[]).map(x=>[x,x]),state.labMaterialType),true):''}</div>`;
      if (state.labMaterialFamily === 'other' || state.labMaterialType ===
        'مادة أخرى غير موجودة بالقائمة') h += field('labOtherName',
        'اسم المادة (لأنها غير موجودة بالقائمة)',
        `<input id="labOtherName" class="ctrl" data-text="labOtherName" value="${escapeHTML(state.labOtherName)}" placeholder="اكتب اسم المادة هنا" maxlength="90">`,
        true);
    }
    if (m === 'product') {
      h +=
        `<div class="two">${field('labProductFamily','ما فئة المنتج أو المكون؟',opts('labProductFamily',Object.entries(PRODUCT_NAMES),state.labProductFamily),true)}${state.labProductFamily?field('labProductType','نوع المنتج الأقرب',opts('labProductType',(PRODUCTS[state.labProductFamily]||[]).map(x=>[x,x]),state.labProductType),true):''}</div>`;
      if (state.labProductFamily === 'other' || state.labProductType === 'منتج آخر غير موجود بالقائمة')
        h += field('labOtherName', 'اسم المنتج (لأنه غير موجود بالقائمة)',
          `<input id="labOtherName" class="ctrl" data-text="labOtherName" value="${escapeHTML(state.labOtherName)}" placeholder="اكتب اسم المنتج هنا" maxlength="90">`,
          true);
    }
    if (m === 'other') h += field('labOtherName', 'ما الشيء المطلوب فحصه؟',
      `<input id="labOtherName" class="ctrl" data-text="labOtherName" value="${escapeHTML(state.labOtherName)}" placeholder="مثال: عينة مياه تبريد أو جهاز قياس" maxlength="120">`,
      true);
    return h;
  }

  function labForm() {
    let h =
      '<div class="notice">لو عارف الاختبار باسمه اختاره مباشرة. لو تعرف المجال أو الخاصية فقط، هنطلب أقل قدر من التفاصيل حتى يستطيع المختص تحديد الطريقة الصحيحة.</div>';
    h += field('labKnowledge', 'إيه اللي تعرفه عن الاختبار المطلوب؟',
      `<div class="lab-choices" id="labKnowledge">${[['exact','أعرف الاختبار بالتحديد','أحدد المجال والاختبار مباشرة'],['area','أعرف مجال الاختبار فقط','مثل كيميائي أو ميكانيكي'],['goal','أعرف الخاصية المطلوب قياسها','مثل تركيب مادة أو متانة منتج']].map(([v,t,d])=>`<button type="button" class="lab-knowledge ${state.labKnowledge===v?'chosen':''}" data-lab-knowledge="${v}" aria-pressed="${state.labKnowledge===v}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`,
      true);
    if (!state.labKnowledge) return h;
    if (state.labKnowledge === 'exact' || state.labKnowledge === 'area') {
      h += field('labArea', 'مجال الاختبار', opts('labArea', LAB_AREAS.map(a => [a[0], a[1]]), state
        .labArea), true);
      if (state.labArea) {
        if (state.labKnowledge === 'exact') {
          h += field('labTest', 'الاختبار المطلوب', opts('labTest', [...labArea()[2],
            ['custom', 'اختبار آخر غير موجود بالقائمة']
          ], state.labTest), true);
          if (state.labTest === 'custom') h += field('labCustomTest', 'اسم الاختبار المطلوب',
            `<input id="labCustomTest" class="ctrl" data-text="labCustomTest" placeholder="اسم الاختبار أو الطريقة" value="${escapeHTML(state.labCustomTest)}" maxlength="130">`,
            true);
        } else {
          const relevant = LAB_AREA_GOALS[state.labArea] || [];
          h += field('labGoal', 'ما الخاصية أو النتيجة التي تريد قياسها؟', opts('labGoal', LAB_GOALS
            .filter(x => relevant.includes(x[0])), state.labGoal), true);
        }
      }
    } else h += field('labGoal', 'ما الخاصية التي تريد قياسها؟', opts('labGoal', LAB_GOALS, state
      .labGoal), true);
    const ready = state.labKnowledge === 'exact' ? !!state.labTest : !!state.labGoal;
    if (ready) {
      const hint = state.labGoal === 'composition' ?
        'إذا كانت العينة خامة، اختر «خامة أو مادة». لو منتج مصنع يمكن اختيار «منتج أو مكون».' : state
        .labGoal === 'strength' ?
        'إذا كنت تختبر عبوة أو جزءا مصنعا اختر «منتج أو مكون»؛ وإذا تختبر خامة خام اختر «خامة أو مادة».' :
        '';
      h += `<div class="lab-subject"><h3 class="section-mini">نوع العينة أو المنتج المطلوب فحصه</h3>`;
      h += field('labItemKind', 'ما نوع الشيء الذي ستجرى عليه التجربة؟', opts('labItemKind', [
        ['material', 'خامة أو مادة'],
        ['product', 'منتج أو جزء من منتج'],
        ['other', 'عينة أو جهاز أو شيء آخر']
      ], state.labItemKind), true, hint);
      if (state.labItemKind) h += labSubjectFields();
      h += '</div>';
      h += field('labSampleNote', 'تفصيل عن العينة أو ظروف الاختبار', text('labSampleNote', state
          .labSampleNote, 'مثال: عبوة تعمل تحت ضغط، أو خامة من مورد جديد'), false,
        'اختياري؛ اكتب فقط لو فيه معلومة مهمة.');
      h += field('labSpecCode', 'رقم المواصفة أو طريقة الاختبار (إن كانت معروفة)',
        `<input id="labSpecCode" class="ctrl" data-text="labSpecCode" value="${escapeHTML(state.labSpecCode)}" placeholder="مثال: ASTM E8/E8M أو ISO 527" maxlength="120">`,
        false, 'لو مش عارف المواصفة، سيبها فاضية؛ المختص يساعد في تحديدها.');
    }
    return h;
  }


  // Metrics depend on request type: observed current effect versus expected improvement.
  const $ = id => document.getElementById(id);
  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  } [c]));

  function empty() {
    return {
      step: 1,
      factory: FACTORIES[0]?.id || '',
      additionalFactoryIds: [],
      kind: '',
      area: '',
      symptom: '',
      probe: '',
      unclearDetail: '',
      opType: '',
      opName: '',
      opDetails: '',
      frequency: '',
      scope: '',
      impacts: [],
      goal: '',
      metricType: '',
      metricValue: '',
      metricUnit: '',
      metricPeriod: '',
      note: '',
      labKnowledge: '',
      labArea: '',
      labTest: '',
      labCustomTest: '',
      labGoal: '',
      labDetail: '',
      labItemKind: '',
      labMaterialFamily: '',
      labMaterialType: '',
      labProductFamily: '',
      labProductType: '',
      labOtherName: '',
      labSampleNote: '',
      labStandard: '',
      labSpecCode: '',
      labUse: '',
      labSampleCount: '',
      consent: false,
      submitted: false,
      ref: ''
    };
  }
  let state = {
    ...empty(),
    ...(init.state || {}),
    submitted: false
  };
  const factory = () => FACTORIES.find(x => x.id === state.factory) || FACTORIES[0];
  const siblingFactories = () => FACTORIES.filter(x => x.company === factory().company && x.id !==
    factory().id);
  const additionalFactories = () => siblingFactories().filter(x => state.additionalFactoryIds.includes(x
    .id));
  const affectedFactories = () => [factory(), ...(state.scope === 'multi' && ['challenge', 'improve']
    .includes(state.kind) ? additionalFactories() : [])];
  const area = () => (state.kind === 'improve' ? IMPROVE_AREAS : AREAS).find(a => a.id === state.area);
  const symptom = () => area()?.items.find(a => a[0] === state.symptom);
  const probeConfig = () => state.kind === 'improve' ? IMPROVE_PROBES[state.area] : (SPECIAL_PROBES[state
    .symptom] || PROBES[state.area]);

  function label(list, id) {
    return list.find(x => x[0] === id)?.[1] || '';
  }

  function toast(s) {
    const t = $('toast');
    t.textContent = s;
    t.style.display = 'block';
    clearTimeout(window._toast);
    window._toast = setTimeout(() => t.style.display = 'none', 2600)
  }
  let timer, submitting = false;

  function displayValues() {
    let d = {};
    document.querySelectorAll('select[data-key]').forEach(x => d[x.dataset.key] = x.options[x
      .selectedIndex]?.text || '');
    document.querySelectorAll('.review-row').forEach(x => {});
    return {
      ...state._display,
      ...d,
      area: area()?.name || state.area,
      symptom: symptom()?.[1] || state.symptom,
      goal: label(outcomeOptions(), state.goal),
      impacts: effectOptions().filter(x => state.impacts.includes(x[0])).map(x => x[1]).join('، ')
    }
  }

  let lastSavedSignature=IMCRecords.draftSignature(state),pendingSave=false;
  function save(){if(submitting)return;state._display=displayValues();const signature=IMCRecords.draftSignature(state);if(signature===lastSavedSignature)return;lastSavedSignature=signature;clearTimeout(timer);pendingSave=false;if(!init.state&&!IMCRecords.meaningfulDraft(state)&&state.factory===FACTORIES[0]?.id)return;pendingSave=true;timer=setTimeout(()=>{pendingSave=false;parent.postMessage({type:'save',state},location.origin)},400);}

  function field(id, title, inner, required = false, desc = '') {
    return `<div class="field" id="f-${id}"><label for="${id}">${title} <span class="${required?'req':'opt'}">${required?'مطلوب':'اختياري'}</span></label>${inner}${desc?`<div class="help">${escapeHTML(desc)}</div>`:''}<div id="err-${id}" class="error" aria-live="polite"></div></div>`
  }

  function opts(id, arr, value, placeholder = 'حدد من القائمة') {
    let h =
      `<select id="${id}" class="ctrl" data-key="${id}"  required><option value="" ${!value?'selected':''} disabled hidden>${placeholder}</option>`;
    h += arr.map(([v, t]) =>
      `<option value="${escapeHTML(v)}" ${value===v?'selected':''}>${escapeHTML(t)}</option>`).join('');
    return h + '</select>'
  }

  function text(id, value, placeholder = '', rows = 2) {
    return `<textarea id="${id}" class="ctrl" data-text="${id}" rows="${rows}" placeholder="${escapeHTML(placeholder)}">${escapeHTML(value)}</textarea>`
  }

  function selectPills(list, selected) {
    return `<div class="impact-grid" id="impacts">${list.map(([v,t])=>`<label class="tag-checkbox"><input type="checkbox" data-impact="${v}" ${selected.includes(v)?'checked':''}><span>${escapeHTML(t)}</span></label>`).join('')}</div>`
  }

  function chooseKind() {
    return `<div class="cards" id="kind">${TYPES.map(([v,t,d,i],index)=>`<button type="button" class="card-choice ${state.kind===v?'chosen':''}" data-kind="${v}" aria-pressed="${state.kind===v}"><span class="ic">${String(index+1).padStart(2,'0')}</span><span><strong>${t}</strong><small>${d}</small></span></button>`).join('')}</div>`
  }

  function stepper() {
    const names = state.kind === 'lab' ? ['المصنع ونوع الطلب', 'تفاصيل الاختبار والعينة',
      'استخدام النتيجة', 'المراجعة والإرسال'
    ] : ['المصنع ونوع الطلب', 'الملاحظة أو الفكرة', 'التأثير والنتيجة', 'المراجعة والإرسال'];
    $('steps').innerHTML = names.map((n, i) =>
      `<button type="button" data-goto-step="${i+1}" class="step ${state.step===i+1?'active':state.step>i+1?'done':''}" ${state.step===i+1?'aria-current="step"':''}><span class="bubble">${state.step>i+1?'✓':i+1}</span><span>${n}</span></button>`
    ).join('')
  }

  function step1() {
    const optsFactory = FACTORIES.map(f => [f.id, f.name]);
    const f = factory();
    return `<h2 class="title">مين المصنع صاحب الطلب؟</h2><p class="subtitle">اختر المصنع المعتمد صاحب الطلب. ترتبط بيانات القطاع والموقع تلقائيا، ويمكن إضافة مصانع أخرى تابعة للشركة عند تحديد النطاق.</p><div class="fields">${field('factory','المصنع',opts('factory',optsFactory,state.factory),true)}<div class="meta"><div class="meta-box"><small>القطاع الصناعي</small><strong>${f.sector}</strong></div><div class="meta-box"><small>المنطقة</small><strong>${f.region}</strong></div><div class="meta-box"><small>المحافظة</small><strong>${f.gov}</strong></div><div class="meta-box"><small>حجم المصنع</small><strong>${f.size}</strong></div></div><h3 class="section-mini" style="margin:4px 0 0">إيه الهدف من تقديم الطلب؟ <span class="req">مطلوب</span></h3>${chooseKind()}<div id="err-kind" class="error"></div><div class="notice">اختيار نوع الطلب مش تشخيص فني؛ فقط علشان نظهر الأسئلة المناسبة ونوفر وقتك.</div></div>`
  }

  function step2() {
    const normal = ['challenge', 'improve'].includes(state.kind);
    let h =
      `<h2 class="title">${state.kind==='improve'?'إيه اللي عايز تحسنه؟':normal?'إيه اللي لاحظته في المصنع؟':state.kind==='lab'?'تفاصيل الاختبار المعملي':'خلينا نفهم طلبك بشكل أوضح'}</h2><p class="subtitle">${state.kind==='improve'?'اختار الجانب اللي عايز تطوره، حتى لو مفيش مشكلة قائمة.':normal?'اختار المجال اللي ظهر فيه التغيير، وبعده الملاحظة المحددة. مش بنطلب منك تعرف السبب.':state.kind==='lab'?'اختار ما تعرفه فقط؛ الأسئلة التالية تتغير حسب الاختبار ونوع العينة، من غير تكرار.':'أسئلة مختصرة حسب نوع الطلب، وبعدها IMC يحدد أنسب مسار للتقييم.'}</p><div class="fields">`;
    if (normal) {
      const improving = state.kind === 'improve';
      h += field('area', improving ? 'في أي مجال تريد تنفيذ التحسين؟' : 'أين ظهرت الملاحظة؟', opts('area',
          (improving ? IMPROVE_AREAS : AREAS).map(a => [a.id, a.name]), state.area, improving ?
          'اختر مجال التطوير' : 'اختر المجال الظاهر فيه الأثر'), true, improving ?
        'اختار الشيء اللي عايز تطوره، من غير ما يكون عندك عطل حالي.' :
        'ده مجال ظهور المشكلة، مش تخصص المصنع ولا تخصص الجامعة.');
      if (state.area) h += field('symptom', improving ? 'ما التحسين الأقرب لفكرتك؟' :
        'إيه أقرب وصف للي حصل؟', opts('symptom', area().items, state.symptom, improving ?
          'حدد التحسين المستهدف' : 'اختر الملاحظة المحددة'), true);
      if (state.symptom) {
        const p = probeConfig();
        h +=
          `<div class="s-panel"><div style="font-weight:800;font-size:13px;color:#216384">${improving?'سؤال واحد لتحديد مكان تطبيق التحسين':'سؤال توضيحي واحد بناء على ملاحظتك'}</div>${field('probe',p.q,opts('probe',p.opts.map(o=>[o,o]),state.probe,'اختر الإجابة الأقرب'),true)}${!improving&&state.area==='unclear'?field('unclearDetail','اذكر في جملة واحدة إيه اللي اتغير أو حصل',text('unclearDetail',state.unclearDetail,'مثال: المنتج بيتغير لونه من دفعة للتانية'),true,'مطلوب هنا فقط لأن الملاحظة العامة وحدها لا تكفي للمراجعة.'):''}</div>`;
      }
      if (state.symptom) h += field('note', improving ? 'تفصيل إضافي عن فرصة التحسين' :
        'تفصيل يساعد المختص يفهم الحالة أسرع', text('note', state.note,
          'ممكن تكتب اسم الماكينة أو المنتج أو معلومة مهمة...'), false,
        'اختياري؛ مش لازم تكتب لو الاختيارات كفاية.');
    } else if (state.kind === 'lab') {
      h += labForm();
    } else {
      const d = OPPORTUNITY[state.kind];
      if (!d) return '<p>ارجع للصفحة الأولى واختر نوع الطلب.</p>';
      h +=
        `${field('opType',d.q,opts('opType',d.opts,state.opType),true)}${field('opName',state.kind==='idea'?'اسم الفكرة أو المنتج المقترح':'اسم المكون أو الخامة أو المنتج المستورد',`<input id="opName" class="ctrl" data-text="opName" maxlength="130" value="${escapeHTML(state.opName)}" placeholder="مثال: صمام تحكم صناعي أو خامة تغليف مقاومة للحرارة">`,true,'يكفي اسم قصير واضح.')}${field('opDetails','ما الذي تريد الوصول إليه بالتحديد؟',text('opDetails',state.opDetails,'مثال: نريد اختبار مدى تحمل العبوة للحرارة قبل تطويرها'),true,'وصف قصير من سطر واحد أو سطرين (10 أحرف على الأقل).')}`;
    }
    h += '</div>';
    return h;
  }

  function scopeList() {
    let a = [
      ['plant', 'المصنع كله'],
      ['line', 'خط إنتاج أو قسم'],
      ['machine', 'ماكينة أو نقطة تشغيل'],
      ['product', 'منتج أو دفعة محددة']
    ];
    if (siblingFactories().length) a.push(['multi', 'أكثر من مصنع تابع لنفس الشركة']);
    return a;
  }

  function multiFactoryField() {
    if (state.scope !== 'multi') return '';
    const other = siblingFactories();
    return `<div class="s-panel"><h3 class="section-mini">حدد المصانع الأخرى المرتبطة بنفس الطلب <span class="req">مطلوب</span></h3><p class="help" style="margin-top:-8px">سيتم تسجيل طلب واحد فقط مع ربطه بكل مصنع متأثر، حتى لا تتكرر أعداد التحديات في الـDashboard.</p><div class="impact-grid" id="additionalFactoryIds">${other.map(f=>`<label class="tag-checkbox"><input type="checkbox" data-other-factory="${escapeHTML(f.id)}" ${state.additionalFactoryIds.includes(f.id)?'checked':''}><span>${escapeHTML(f.name)} — ${escapeHTML(f.gov)}</span></label>`).join('')}</div><div class="error" id="err-additionalFactoryIds"></div></div>`;
  }

  function step3() {
    const normal = ['challenge', 'improve'].includes(state.kind);
    if (state.kind === 'lab') {
      let h =
        `<h2 class="title">استخدام نتيجة الاختبار</h2><p class="subtitle">هنسألك سؤال أساسي واحد لتوجيه الطلب؛ وأي تفاصيل إضافية اختيارية لو عندك.</p><div class="fields">`;
      h += field('labUse', 'هتستخدم نتيجة الاختبار في إيه؟', opts('labUse', LAB_USAGE, state.labUse),
        true);
      h += field('labSampleCount', 'عدد العينات المتوقع (لو معروف)',
        `<input id="labSampleCount" class="ctrl" type="number" min="1" step="1" data-text="labSampleCount" value="${escapeHTML(state.labSampleCount)}" placeholder="مثال: 3">`,
        false, 'المعمل يتفق معك لاحقا على العدد المطلوب والتجهيز.');
      h +=
        `<div class="notice">بيانات الاختبار مش معناها إن الطريقة العلمية اتحددت نهائيا؛ المختص يراجع نوع العينة والقياس قبل الإجراء.</div></div>`;
      return h;
    }
    const existing = state.kind === 'challenge';
    let h =
      `<h2 class="title">${existing?'ما التأثير الحالي للتحدي؟':'ما الفائدة التي تستهدف تحقيقها؟'}</h2><p class="subtitle">${existing?'اختار الأضرار الفعلية الحاصلة الآن، ثم النتيجة التي ترغب في الوصول إليها.':'اختار المنافع الإيجابية المتوقعة من الفكرة أو التحسين، مش مشكلات أو خسائر غير موجودة.'}</p><div class="fields">`;
    if (normal) {
      h +=
        `<div class="two">${state.kind==='challenge'?field('frequency','الحالة بتحصل قد إيه؟',opts('frequency',[['always','مستمرة معظم الوقت'],['daily','يوميا أو كل وردية'],['weekly','عدة مرات أسبوعيا'],['monthly','مرة أو مرتين شهريا'],['rare','على فترات متباعدة'],['once','حدثت مرة واحدة']],state.frequency),true):''}${field('scope',existing?'المشكلة بتأثر على أنهي نطاق؟':'التحسين هيتطبق على أنهي نطاق؟',opts('scope',scopeList(),state.scope),true)}</div>${multiFactoryField()}`;
    }
    h += field('impacts', existing ? 'ما الأضرار أو التأثيرات الحالية؟' :
      'ما الفوائد المتوقعة من تنفيذ الطلب؟', selectPills(effectOptions(), state.impacts), true,
      existing ? 'اختر التأثيرات التي تحدث بالفعل.' :
      'اختر الفوائد الإيجابية التي تستهدفها. يمكن اختيار أكثر من فائدة.');
    h += field('goal', existing ? 'ما النتيجة المطلوبة بعد معالجة التحدي؟' :
      'ما المخرج الأساسي الذي تريد الوصول إليه؟', opts('goal', outcomeOptions(), state.goal), true);
    const m = metricOptions(),
      cfg = metricCfg();
    const u = state.metricType ? opts('metricUnit', cfg.units.map(x => [x, x]), state.metricUnit,
      'حدد الوحدة') : '';
    const period = state.metricType && cfg.periods.length ? opts('metricPeriod', cfg.periods.map(x => [x,
      x
    ]), state.metricPeriod, 'حدد الفترة') : '';
    h +=
      `<div class="metric"><div class="metric-top"><h4>${existing?'هل لديك رقم يوضح التأثير الحالي؟':'هل عندك رقم مستهدف للتحسن؟'} <span class="opt">اختياري</span></h4><button class="btn small" id="clearMetric" type="button" ${!(state.metricType||state.metricValue)?'disabled':''}>✕ إلغاء القياس ومسح الرقم</button></div><div class="metric-grid">${opts('metricType',m.map(x=>[x[0],x[1]]),state.metricType,existing?'اختر قياسا حاليا إن وجد':'اختر مستهدفا رقميا إن وجد')}<input id="metricValue" class="ctrl" data-text="metricValue" type="number" min="0" step="any" inputmode="decimal" ${state.metricType?'':'disabled'} placeholder="القيمة الرقمية (اختياري)" value="${escapeHTML(state.metricValue)}"></div>${state.metricType?`<div class="metric-meta"><div>${field('metricUnit','وحدة القياس',u,true)}</div>${cfg.periods.length?`<div>${field('metricPeriod','الفترة الزمنية',period,true)}</div>`:''}</div><div class="help">يتم حفظ القيمة والوحدة والفترة كحقول مستقلة لقياسها وتحليلها بدقة.</div>`:'<div class="help">إذا ما عندكش رقم موثوق، سيب القياس فارغا.</div>'}<div class="error" id="err-metricValue"></div></div>`;
    h += '</div>';
    return h;
  }

  function item(t, v) {
    return `<div class="review-row"><span>${escapeHTML(t)}</span><strong>${escapeHTML(v||'—')}</strong></div>`
  }

  function labReview() {
    let mode = labSubjectMode();
    return item('مستوى معرفة الاختبار', label([
      ['exact', 'أعرف الاختبار بالاسم'],
      ['area', 'أعرف المجال'],
      ['goal', 'أعرف الخاصية المستهدفة']
    ], state.labKnowledge)) + item('مجال الاختبار', labArea()?.[1]) + item('الاختبار المحدد', state
      .labTest === 'custom' ? state.labCustomTest : (labArea()?.[2] || []).find(x => x[0] === state
        .labTest)?.[1]) + item('الخاصية المطلوبة', labGoalLabel()) + item('نوع العينة أو المنتج',
      mode === 'material' ? MATERIAL_NAMES[state.labMaterialFamily] + ' — ' + state.labMaterialType :
      mode === 'product' ? PRODUCT_NAMES[state.labProductFamily] + ' — ' + state.labProductType : state
      .labOtherName) + item('اسم آخر للعينة', state.labOtherName) + item('ظروف الاختبار', state
      .labSampleNote) + item('المواصفة القياسية', state.labSpecCode || 'غير محددة — تراجع لاحقا');
  }

  function editSection(step){return `<button type="button" class="review-edit" data-goto-step="${step}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 16l12-12 4 4L8 20H4zM14 6l4 4"/></svg>تعديل هذا القسم</button>`;}
  function goToStep(target){if(submitting||!Number.isInteger(target)||target<1||target>4||target===state.step)return;state._display=displayValues();if(target<state.step){state.step=target;state.consent=false;render();scrollTop();return}while(state.step<target){if(!validate())return;state.step++;render()}scrollTop();}
  function step4() {
    const f = factory(),
      normal = ['challenge', 'improve'].includes(state.kind);
    let h =
      `<h2 class="title">راجع بيانات طلبك</h2><p class="subtitle">تأكد إن اللي اخترته صحيح. تقدر ترجع لأي خطوة وتعدلها قبل الإرسال.</p>`;
    h +=
      `<div class="review"><div class="review-heading"><h3>المصنع والطلب</h3>${editSection(1)}</div>${item('المصنع الأساسي',f.name)}${item('القطاع',f.sector)}${item('المحافظة / المنطقة',f.gov+' — '+f.region)}${item('نوع الطلب',label(TYPES,state.kind))}${normal&&state.scope==='multi'?item('المصانع الإضافية',additionalFactories().map(x=>x.name+' — '+x.gov).join('، ')):''}</div>`;
    h +=
      `<div class="review"><div class="review-heading"><h3>${state.kind==='lab'?'تفاصيل الاختبار والعينة':state.kind==='improve'?'فرصة التحسين':normal?'الملاحظة المسجلة':'الفكرة أو الاحتياج'}</h3>${editSection(2)}</div>${normal?item(state.kind==='improve'?'مجال التطوير':'المجال الظاهر فيه التأثير',area()?.name)+item(state.kind==='improve'?'التحسين المطلوب':'الملاحظة',symptom()?.[1])+item('تفصيل إضافي للتوجيه',state.probe)+item('معلومات أخرى',state.unclearDetail||state.note):state.kind==='lab'?labReview():item('النوع الفرعي',label(OPPORTUNITY[state.kind]?.opts||[],state.opType))+item('الموضوع',state.opName)+item('التفاصيل',state.opDetails)}</div>`;
    let details = '';
    if (state.kind === 'challenge') details += item('التكرار', label([
      ['always', 'مستمرة معظم الوقت'],
      ['daily', 'يوميا أو كل وردية'],
      ['weekly', 'عدة مرات أسبوعيا'],
      ['monthly', 'مرة أو مرتين شهريا'],
      ['rare', 'على فترات متباعدة'],
      ['once', 'حدثت مرة واحدة']
    ], state.frequency));
    if (normal) details += item('النطاق', label(scopeList(), state.scope));
    if (state.kind === 'lab') details += item('استخدام نتيجة الاختبار', label(LAB_USAGE, state.labUse)) +
      item('عدد العينات', state.labSampleCount);
    else {
      details += item(state.kind === 'challenge' ? 'الأضرار الحالية' : 'الفوائد المستهدفة', state.impacts
        .map(v => label(effectOptions(), v)).join('، '));
      details += item(state.kind === 'challenge' ? 'النتيجة المطلوبة' : 'المخرج المطلوب', label(
        outcomeOptions(), state.goal));
      if (state.metricType) details += item('القياس', label(metricOptions(), state.metricType) + ': ' +
        state.metricValue + ' ' + (state.metricUnit || '') + (state.metricPeriod ? ' / ' + state
          .metricPeriod : ''));
    }
    h += `<div class="review"><div class="review-heading"><h3>${state.kind==='lab'?'استخدام النتيجة':'الأثر والنتيجة'}</h3>${editSection(3)}</div>${details}</div>`;
    h +=
      `<div class="notice">بعد الإرسال IMC يراجع الحالة ويتحقق من حالات مشابهة ويسجل نتيجة التقييم والمسار المقترح. اختيارك لا يعد تشخيصا نهائيا.</div><label class="consent"><input type="checkbox" id="consent" ${state.consent?'checked':''}><span>أوافق على استخدام البيانات المقدمة لتقييم الطلب داخل IMC والتواصل بخصوصه وفق سياسة استخدام البيانات الموضحة في الموقع. <b style="color:var(--danger)">*</b></span></label><div class="error" id="err-consent"></div>`;
    return h;
  }

  function recommended() {
    const names = {
      industrial_engineering: 'هندسة الإنتاج والعمليات',
      manufacturing_process: 'تكنولوجيا التصنيع',
      mechanical_engineering: 'هندسة ميكانيكية',
      maintenance: 'صيانة وهندسة اعتمادية',
      electrical_engineering: 'هندسة كهربائية',
      energy_systems: 'طاقة وكفاءة استهلاك',
      thermal_engineering: 'هندسة حرارية',
      materials_science: 'علم وهندسة المواد',
      chemical_engineering: 'هندسة كيميائية',
      quality_engineering: 'هندسة الجودة',
      metrology: 'قياس ومعايرة',
      product_design: 'تصميم وتطوير منتجات',
      control_automation: 'تحكم وأتمتة',
      digital_manufacturing: 'نظم تصنيع رقمية',
      laboratory_testing: 'فحوص ومعامل',
      environmental_engineering: 'هندسة بيئية',
      packaging_engineering: 'هندسة التعبئة والتغليف',
      safety_engineering: 'سلامة فنية',
      technical_training: 'تدريب فني',
      initial_triage: 'فرز وتشخيص مبدئي'
    };
    let k = ['challenge', 'improve'].includes(state.kind) ? area()?.discipline : state.kind === 'idea' ? [
      'product_design', 'manufacturing_process'
    ] : state.kind === 'localize' ? ['manufacturing_process', 'materials_science'] : [
      'laboratory_testing', 'metrology'
    ];
    return (k || ['initial_triage']).map(x => names[x] || x);
  }

  function render() {
    stepper();
    $('body').innerHTML = state.step === 1 ? step1() : state.step === 2 ?
      step2() : state.step === 3 ? step3() : step4();
    $('actions').innerHTML =
      `<button class="btn" id="back" ${state.step===1?'disabled':''}>السابق</button><small>الخطوة ${state.step} من 4</small><button class="btn primary" id="next">${state.step===4?'إرسال الطلب إلى المركز':'التالي'}</button>`;
    save()
  }

  function markError(key, message) {
    const el = $('' + key) || $('f-' + key);
    el?.classList.add('invalid');
    const e = $('err-' + key);
    if (e) e.textContent = message;
    return false
  }

  function validate() {
    let ok = true,
      first = null;

    function required(id, yes, msg) {
      if (!yes) {
        markError(id, msg || 'الإجابة مطلوبة للانتقال.');
        ok = false;
        if (!first) first = id
      }
    }
    const normal = ['challenge', 'improve'].includes(state.kind);
    if (state.step === 1) {
      required('factory',FACTORIES.some(f=>f.id===state.factory),'اختر المصنع صاحب الطلب.');
      required('kind', !!state.kind, 'اختار نوع الطلب.');
    }
    if (state.step === 2) {
      if (normal) {
        required('area', !!state.area, 'اختر المجال اللي ظهر فيه التأثير.');
        required('symptom', !!state.symptom, 'اختر الملاحظة اللي حدثت فعلا.');
        required('probe', !!state.probe, 'جاوب عن السؤال التوضيحي.');
        if (state.kind === 'challenge' && state.area === 'unclear') required('unclearDetail', state
          .unclearDetail.trim().length >= 12, 'لازم وصف بسيط يوضح إيه اللي اتغير (12 حرفا على الأقل).');
      } else if (state.kind === 'lab') {
        required('labKnowledge', !!state.labKnowledge, 'اختر مستوى معرفة الاختبار.');
        if (state.labKnowledge === 'exact' || state.labKnowledge === 'area') required('labArea', !!state
          .labArea, 'حدد مجال الاختبار.');
        if (state.labKnowledge === 'exact') {
          required('labTest', !!state.labTest, 'حدد الاختبار المطلوب.');
          if (state.labTest === 'custom') required('labCustomTest', state.labCustomTest.trim().length >=
            4, 'اكتب اسم الاختبار.');
        } else required('labGoal', !!state.labGoal, 'حدد الخاصية أو الهدف.');
        const ready = state.labKnowledge === 'exact' ? !!state.labTest : !!state.labGoal;
        if (ready) {
          const m = labSubjectMode();
          required('labItemKind', !!m, 'حدد نوع العينة أو المنتج.');
          if (m === 'material') {
            required('labMaterialFamily', !!state.labMaterialFamily, 'حدد عائلة المادة.');
            required('labMaterialType', !!state.labMaterialType, 'حدد نوع المادة.');
            if (state.labMaterialFamily === 'other' || state.labMaterialType ===
              'مادة أخرى غير موجودة بالقائمة') required('labOtherName', state.labOtherName.trim()
              .length >= 3, 'اذكر اسم المادة.');
          } else if (m === 'product') {
            required('labProductFamily', !!state.labProductFamily, 'حدد فئة المنتج.');
            required('labProductType', !!state.labProductType, 'حدد نوع المنتج.');
            if (state.labProductFamily === 'other' || state.labProductType ===
              'منتج آخر غير موجود بالقائمة') required('labOtherName', state.labOtherName.trim().length >=
              3, 'اذكر اسم المنتج.');
          } else if (m === 'other') required('labOtherName', state.labOtherName.trim().length >= 4,
            'وضح العينة المطلوب اختبارها.');
        }

      } else {
        required('opType', !!state.opType);
        required('opName', state.opName.trim().length >= 4, 'اكتب اسما واضحا للموضوع.');
        required('opDetails', state.opDetails.trim().length >= 10, 'اكتب وصفا مختصرا يوضح الهدف.');
      }
    }
    if (state.step === 3) {
      if (state.kind === 'lab') {
        required('labUse', !!state.labUse, 'حدد استخدام نتيجة الاختبار.');
        if (state.labSampleCount !== '' && (!Number.isInteger(Number(state.labSampleCount)) || Number(
            state.labSampleCount) < 1)) required('labSampleCount', false,
          'عدد العينات يجب أن يكون عددا صحيحا موجبا.');
      } else {
        if (normal) {
          if (state.kind === 'challenge') required('frequency', !!state.frequency);
          required('scope', !!state.scope);
          if (state.scope === 'multi') required('additionalFactoryIds', additionalFactories().length > 0,
            'حدد مصنعا إضافيا على الأقل تابعا لنفس الشركة.');
        }
        required('impacts', state.impacts.length > 0, 'حدد على الأقل تأثيرا أو فائدة واحدة.');
        required('goal', !!state.goal);
        if (state.metricType) {
          if (state.metricValue === '' || !Number.isFinite(Number(state.metricValue)) || Number(state
              .metricValue) < 0) required('metricValue', false,
            'أدخل رقما صالحا أو اضغط «إلغاء القياس».');
          required('metricUnit', !!state.metricUnit, 'حدد وحدة القياس.');
          if (metricCfg().periods.length) required('metricPeriod', !!state.metricPeriod,
            'حدد الفترة الزمنية.');
        }
      }
    }
    if (state.step === 4) required('consent', state.consent, 'الموافقة على معالجة البيانات مطلوبة.');
    if (!ok) {
      let target = $('f-' + first) || $(first);
      target?.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
    }
    return ok;
  }

  function scrollTop() {
    parent.postMessage({
      type: 'scrollTop'
    }, location.origin);
  }

  function next() {
    if (!validate() || submitting) return;
    if (state.step === 4) {
      clearTimeout(timer);
      state._display = displayValues();
      submitting = true;
      $('next').disabled = true;
      $('next').textContent = 'جار الإرسال…';
      parent.postMessage({
        type: 'submit',
        state
      }, location.origin);
      return
    }
    state._display = displayValues();
    state.step++;
    render();
    scrollTop()
  }
  window.addEventListener('message', e => {
    if (e.origin === location.origin && e.source === parent && e.data.type === 'error') {
      submitting = false;
      render();
      toast(e.data.message)
    }
  });

  function clearFromKind() {
    Object.assign(state, {
      area: '',
      symptom: '',
      probe: '',
      unclearDetail: '',
      opType: '',
      opName: '',
      opDetails: '',
      frequency: '',
      scope: '',
      additionalFactoryIds: [],
      impacts: [],
      goal: '',
      metricType: '',
      metricValue: '',
      metricUnit: '',
      metricPeriod: '',
      note: ''
    });
    labResetAll();
  }

  function setSelect(key, value) {
    if (key === 'kind') {
      if (state.kind !== value) {
        state.kind = value;
        clearFromKind()
      }
    } else if (key === 'factory') {
      state.factory = value;
      state.additionalFactoryIds = [];
      if (state.scope === 'multi' && !siblingFactories().length) state.scope = '';
    } else if (key === 'scope') {
      state.scope = value;
      if (value !== 'multi') state.additionalFactoryIds = [];
    } else if (key === 'area') {
      state.area = value;
      state.symptom = '';
      state.probe = '';
      state.unclearDetail = '';
      state.note = ''
    } else if (key === 'symptom') {
      state.symptom = value;
      state.probe = '';
      state.unclearDetail = '';
      state.note = ''
    } else if (key === 'metricType') {
      state.metricType = value;
      state.metricValue = '';
      state.metricUnit = metricCfg().unit;
      state.metricPeriod = metricCfg().period;
    } else if (key === 'labArea') {
      state.labArea = value;
      state.labTest = '';
      state.labCustomTest = '';
      state.labGoal = '';
      state.labDetail = '';
      state.labItemKind = '';
      labResetSubject();
      state.labStandard = '';
      state.labSpecCode = ''
    } else if (key === 'labGoal') {
      state.labGoal = value;
      state.labDetail = '';
      state.labItemKind = '';
      labResetSubject()
    } else if (key === 'labTest') {
      state.labTest = value;
      state.labCustomTest = '';
      state.labItemKind = '';
      labResetSubject()
    } else if (key === 'labDetail') {
      state.labDetail = value
    } else if (key === 'labItemKind') {
      state.labItemKind = value;
      labResetSubject()
    } else if (key === 'labMaterialFamily') {
      state.labMaterialFamily = value;
      state.labMaterialType = '';
      state.labOtherName = ''
    } else if (key === 'labProductFamily') {
      state.labProductFamily = value;
      state.labProductType = '';
      state.labOtherName = ''
    } else if (key === 'labMaterialType' || key === 'labProductType') {
      state[key] = value;
      state.labOtherName = ''
    } else if (key === 'labStandard') {
      state.labStandard = value;
      state.labSpecCode = ''
    } else state[key] = value;
    render();
  }

  function reset() {
    if (!confirm('هل تريد مسح بيانات هذه المسودة؟')) return;
    state = empty();
    render();
    scrollTop()
  }

  function showRecords() {
    parent.location.hash = 'cases'
  }
  // Event delegation; text input doesn't re-render while typing, so the caret stays stable.
  document.addEventListener('click', e => {
    const jump=e.target.closest('[data-goto-step]');if(jump){goToStep(Number(jump.dataset.gotoStep));return}
    const lab = e.target.closest('[data-lab-knowledge]');
    if (lab) {
      const v = lab.dataset.labKnowledge;
      if (state.labKnowledge !== v) {
        labResetAll();
        state.labKnowledge = v;
      }
      render();
      return
    }
    const k = e.target.closest('[data-kind]');
    if (k) {
      setSelect('kind', k.dataset.kind);
      return
    }
    if (e.target.closest('#clearMetric')) {
      state.metricType = '';
      state.metricValue = '';
      state.metricUnit = '';
      state.metricPeriod = '';
      render();
      return
    }
    if (e.target.closest('#next')) {
      next();
      return
    }
    if (e.target.closest('#back')) {
      state.step = Math.max(1, state.step - 1);
      render();
      scrollTop();
      return
    }
    if (e.target.closest('#clearDraft') || e.target.closest('#newAfter')) {
      reset();
      return
    }
    if (e.target.closest('#viewRecords')) {
      showRecords();
      return
    }

  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.key) {
      setSelect(el.dataset.key, el.value);
      return
    }
    if (el.dataset.otherFactory) {
      const allowed = siblingFactories().some(x => x.id === el.dataset.otherFactory);
      if (allowed) {
        state.additionalFactoryIds = state.additionalFactoryIds.filter(x => x !== el.dataset
          .otherFactory);
        if (el.checked) state.additionalFactoryIds.push(el.dataset.otherFactory);
        save();
      }
      return
    }
    if (el.dataset.impact) {
      const a = state.impacts.filter(v => v !== el.dataset.impact);
      if (el.checked) a.push(el.dataset.impact);
      state.impacts = a;
      save();
      return
    }
    if (el.id === 'consent') {
      state.consent = el.checked;
      save();
      return
    }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.text) {
      state[el.dataset.text] = el.value;
      save();
      const er = $('err-' + el.id);
      if (er) er.textContent = '';
      el.classList.remove('invalid')
    }
  });
  render();
  new ResizeObserver(() => parent.postMessage({
    type: 'height',
    height: document.body.scrollHeight + 40
  }, location.origin)).observe(document.body);
})();

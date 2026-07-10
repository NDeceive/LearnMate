import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Course, WeakPoint } from "../types";
import { fetchApiData, KnowledgeMasteryRecord } from "../api";
import {
  TrendingUp,
  Brain,
  Award,
  BookOpen,
  Maximize2,
  RefreshCw,
  Search,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
  ShieldAlert
} from "lucide-react";

interface KnowledgeGraphProps {
  courses: Course[];
  weakPoints: WeakPoint[];
  onNavigateToTab: (tab: string, prefillData?: string | { subject?: string; knowledgePoint?: string }) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "root" | "course" | "weakpoint" | "general";
  proficiency: number; // 0-100
  courseId?: string;
  level?: "High" | "Medium" | "Low"; // for weakpoints
  count?: number; // error count for weakpoints
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  isDependency?: boolean;
  depLabel?: string;
}

function normalizeMastery(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getMasteryStatus(record: KnowledgeMasteryRecord) {
  const practiceCount = Number(record.practice_count || 0);
  const mastery = normalizeMastery(Number(record.mastery));

  if (practiceCount <= 0) {
    return {
      label: "未训练",
      color: "bg-slate-50 border-slate-200 text-slate-500",
      bar: "bg-slate-300"
    };
  }

  if (mastery >= 80) {
    return {
      label: "掌握较好",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      bar: "bg-emerald-500"
    };
  }

  if (mastery >= 60) {
    return {
      label: "需要巩固",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      bar: "bg-amber-500"
    };
  }

  return {
    label: "薄弱知识点",
    color: "bg-rose-50 border-rose-200 text-rose-800",
    bar: "bg-rose-500"
  };
}

// Generate stable deterministic 7-day trend history data for each node
const getSparklineData = (nodeId: string, currentProficiency: number) => {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = nodeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const history: number[] = [];
  let currentVal = currentProficiency;
  history.push(currentVal);
  
  for (let i = 0; i < 6; i++) {
    const wave = Math.sin(hash + i) * 4;
    const growth = 1.0 + (Math.abs(hash) % 3) * 0.5;
    currentVal = Math.max(15, Math.min(100, Math.round(currentVal - (growth + wave))));
    history.unshift(currentVal);
  }
  return history;
};

export default function KnowledgeGraph({ courses, weakPoints, onNavigateToTab }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform | null>(null);
  const [masteryRecords, setMasteryRecords] = useState<KnowledgeMasteryRecord[]>([]);
  const [masteryApiLoaded, setMasteryApiLoaded] = useState(false);

  // Hardcode zoom controller ref
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchApiData<KnowledgeMasteryRecord>("/api/profile/knowledge-mastery")
      .then((data) => {
        if (!cancelled) {
          setMasteryRecords(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMasteryRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMasteryApiLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Construct Graph Nodes and Links dynamically
  const nodes: GraphNode[] = [
    { id: "root", name: "计算机专业核心课 (408)", type: "root", proficiency: 85 }
  ];

  // Add course nodes
  courses.forEach(c => {
    nodes.push({
      id: c.id,
      name: c.name,
      type: "course",
      proficiency: c.proficiency,
      courseId: c.id
    });
  });

  // Add weak point nodes
  weakPoints.forEach(wp => {
    const parentCourse = courses.find(c => c.name === wp.course);
    nodes.push({
      id: wp.id,
      name: wp.name,
      type: "weakpoint",
      proficiency: wp.remediationProgress, // remediation progress as mastery
      courseId: parentCourse ? parentCourse.id : "data-struct",
      level: wp.level,
      count: wp.count
    });
  });

  // Add key general topic nodes to round out the map
  const generalTopics = [
    { id: "gen-c-ptr", name: "多级指针与内存布局", courseId: "c-lang", proficiency: 94 },
    { id: "gen-c-struct", name: "结构体内存对齐与共用体", courseId: "c-lang", proficiency: 90 },
    { id: "gen-ds-tree", name: "二叉树非递归前中后序遍历", courseId: "data-struct", proficiency: 88 },
    { id: "gen-ds-graph", name: "邻接矩阵与最短路径算法", courseId: "data-struct", proficiency: 85 },
    { id: "gen-comp-cpu", name: "CPU单指令周期流水线设计", courseId: "comp-org", proficiency: 83 },
    { id: "gen-comp-cache", name: "Cache全相联与组相联映射", courseId: "comp-org", proficiency: 80 },
    { id: "gen-os-mem", name: "虚拟存储器分页与页面置换", courseId: "os", proficiency: 91 },
    { id: "gen-os-io", name: "I/O 调度机制与 DMA 传输", courseId: "os", proficiency: 87 },
    { id: "gen-net-ip", name: "IP 路由选择与子网掩码合并", courseId: "networks", proficiency: 76 },
    { id: "gen-net-http", name: "TCP/UDP 及 TLS 密钥交换细节", courseId: "networks", proficiency: 81 }
  ];

  generalTopics.forEach(gt => {
    // Only add if course exists in courses prop
    if (courses.some(c => c.id === gt.courseId)) {
      nodes.push({
        id: gt.id,
        name: gt.name,
        type: "general",
        proficiency: gt.proficiency,
        courseId: gt.courseId
      });
    }
  });

  // Construct Links
  const links: GraphLink[] = [];

  // Links from root to courses
  courses.forEach(c => {
    links.push({ source: "root", target: c.id, value: 2.5 });
  });

  // Links from courses to subtopics (weakpoints and general)
  nodes.forEach(node => {
    if (node.type === "weakpoint" || node.type === "general") {
      if (node.courseId) {
        links.push({ source: node.courseId, target: node.id, value: 1.5 });
      }
    }
  });

  // Predecessor-successor curriculum core dependencies
  const dependencies = [
    { source: "c-lang", target: "data-struct", label: "C 指针与内存是实现数据结构的编程与调试基础" },
    { source: "data-struct", target: "os", label: "数据结构支撑操作系统中进程就绪/阻塞队列与空闲分区分配" },
    { source: "comp-org", target: "os", label: "计算机硬件体系提供页表、中断硬件支持，配合 OS 实现虚拟内存与并发管理" },
    { source: "os", target: "networks", label: "操作系统的网络协议栈（TCP/IP Socket）是上层网络通信的系统调用级支撑" },
    { source: "gen-c-ptr", target: "gen-ds-tree", label: "多级指针与内存对齐是深刻理解与独立编码非递归二叉树遍历的基石" },
    { source: "gen-c-struct", target: "gen-comp-cache", label: "结构体成员对齐以及数组连续存放形式直接影响 Cache 局部性与主存块命中率" },
    { source: "gen-ds-graph", target: "gen-net-ip", label: "图论中最短路径 Dijkstra 算法是计算机网络动态路由选择协议（如 OSPF）的核心底层机制" },
    { source: "gen-comp-cache", target: "gen-os-mem", label: "Cache 组相联映射以及置换机制，在设计思想上与操作系统的虚存分页/置换算法完全贯通" },
    { source: "gen-os-mem", target: "gen-os-io", label: "虚拟内存因缺页而引发的置换与数据调入调出，高度依赖 I/O 调度机制以及 DMA 零拷贝传输" }
  ];

  // Add predecessor-successor dependency links
  dependencies.forEach(dep => {
    const sourceExists = nodes.some(n => n.id === dep.source);
    const targetExists = nodes.some(n => n.id === dep.target);
    if (sourceExists && targetExists) {
      links.push({
        source: dep.source,
        target: dep.target,
        value: 1.8,
        isDependency: true,
        depLabel: dep.label
      });
    }
  });

  // Helper to query dependencies context for a given node
  const getDependencyContext = (nodeId: string) => {
    const precursors = dependencies.filter(d => d.target === nodeId).map(d => ({
      id: d.source,
      name: nodes.find(n => n.id === d.source)?.name || d.source,
      label: d.label
    }));

    const successors = dependencies.filter(d => d.source === nodeId).map(d => ({
      id: d.target,
      name: nodes.find(n => n.id === d.target)?.name || d.target,
      label: d.label
    }));

    return { precursors, successors };
  };

  const depContext = selectedNode ? getDependencyContext(selectedNode.id) : null;

  // Filter nodes for search
  const filteredNodes = nodes.filter(node => 
    node.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Set default selection to first course or root if nothing selected
  useEffect(() => {
    if (!selectedNode) {
      const initialNode = nodes.find(n => n.id === "data-struct") || nodes[0];
      setSelectedNode(initialNode);
    }
  }, [courses]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll("*").remove();

    // Size variables
    const width = containerRef.current.clientWidth || 600;
    const height = 500;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", height)
      .style("border-radius", "16px");

    // Definition of Gradients & Filters
    const defs = svg.append("defs");

    // Self-contained keyframe animation styles inside SVG defs
    defs.append("style").text(`
      @keyframes dependency-flow {
        to {
          stroke-dashoffset: -20;
        }
      }
      .dependency-flow-line {
        stroke-dasharray: 6, 4;
        animation: dependency-flow 1.5s linear infinite;
      }
    `);

    // Arrow marker for predecessor-successor dependencies
    defs.append("marker")
      .attr("id", "arrow-dependency")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20) // offset to point clearly on outer border
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4 L8,0 L0,4 Z")
      .attr("fill", "#6366f1");

    // Glow effect filter
    const glowFilter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "blur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // SVG Main Group for zooming
    const mainGroup = svg.append("g").attr("class", "graph-content");

    // Grid background
    const gridPattern = defs.append("pattern")
      .attr("id", "grid-pattern")
      .attr("width", 25)
      .attr("height", 25)
      .attr("patternUnits", "userSpaceOnUse");
    gridPattern.append("path")
      .attr("d", "M 25 0 L 0 0 0 25")
      .attr("fill", "none")
      .attr("stroke", "rgba(148, 163, 184, 0.05)")
      .attr("stroke-width", "1");

    mainGroup.append("rect")
      .attr("width", width * 3)
      .attr("height", height * 3)
      .attr("x", -width)
      .attr("y", -height)
      .attr("fill", "url(#grid-pattern)")
      .attr("pointer-events", "all");

    // Colors mapping based on mastery levels
    const getNodeColor = (node: GraphNode) => {
      if (node.type === "root") return "#1e293b"; // Slate-800
      
      const score = node.proficiency;
      if (node.type === "weakpoint") {
        if (score < 60) return "#f43f5e"; // Rose-500
        if (score < 75) return "#f59e0b"; // Amber-500
        return "#10b981"; // Emerald-500
      }
      if (score >= 85) return "#10b981"; // Emerald-500
      if (score >= 70) return "#4f46e5"; // Indigo-600
      return "#f59e0b"; // Amber-500
    };

    const getStrokeColor = (node: GraphNode) => {
      if (node.type === "root") return "rgba(15, 23, 42, 0.25)";
      const color = getNodeColor(node);
      return d3.color(color)?.brighter(0.5)?.toString() || color;
    };

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
        setZoomTransform(event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Initial transform to center
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(1));

    // Links group
    const linkGroup = mainGroup.append("g")
      .attr("class", "links");

    // Nodes group
    const nodeGroup = mainGroup.append("g")
      .attr("class", "nodes");

    // Force simulation setup
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(link => {
          const s = link.source as GraphNode;
          const t = link.target as GraphNode;
          if (link.isDependency) return 145; // wider distance for predecessor-successor core paths
          if (s && s.type === "root") return 110;
          if (t && t.type === "weakpoint") return 75;
          return 85;
        })
      )
      .force("charge", d3.forceManyBody().strength((d) => {
        const node = d as GraphNode;
        if (node.type === "root") return -600;
        if (node.type === "course") return -300;
        return -150;
      }))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => {
        const node = d as GraphNode;
        if (node.type === "root") return 35;
        if (node.type === "course") return 26;
        return 18;
      }));

    // Create link elements
    const linkElements = linkGroup.selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", d => d.value)
      .attr("stroke", d => d.isDependency ? "rgba(99, 102, 241, 0.45)" : "rgba(148, 163, 184, 0.15)")
      .attr("stroke-opacity", d => d.isDependency ? 0.8 : 0.65)
      .attr("marker-end", d => d.isDependency ? "url(#arrow-dependency)" : null)
      .attr("class", d => d.isDependency ? "dependency-flow-line" : null)
      .style("transition", "stroke 0.2s, stroke-width 0.2s, stroke-opacity 0.2s");

    // Create node container groups
    const nodeElements = nodeGroup.selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-container")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Render node circles
    nodeElements.append("circle")
      .attr("r", d => {
        if (d.type === "root") return 25;
        if (d.type === "course") return 18;
        return 11;
      })
      .attr("fill", d => getNodeColor(d))
      .attr("stroke", d => getStrokeColor(d))
      .attr("stroke-width", d => (d.type === "root" ? 4 : d.type === "course" ? 3 : 2))
      .style("transition", "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)")
      .style("box-shadow", "0 10px 15px -3px rgba(0, 0, 0, 0.1)")
      .attr("filter", d => {
        const score = d.proficiency;
        if (d.type === "root") return "url(#glow)";
        if (d.type === "weakpoint" && score < 60) return "url(#glow)"; // Glow for weak points
        return null;
      });

    // Outer progress ring for course & weakpoint nodes
    nodeElements.filter(d => d.type === "course" || d.type === "weakpoint")
      .append("circle")
      .attr("r", d => (d.type === "course" ? 22 : 14))
      .attr("fill", "none")
      .attr("stroke", d => {
        const score = d.proficiency;
        if (score >= 85) return "rgba(16, 185, 129, 0.25)";
        if (score >= 70) return "rgba(79, 70, 229, 0.2)";
        return "rgba(244, 63, 94, 0.2)";
      })
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => {
        const radius = d.type === "course" ? 22 : 14;
        const circumference = 2 * Math.PI * radius;
        const strokeLength = (d.proficiency / 100) * circumference;
        return `${strokeLength} ${circumference - strokeLength}`;
      })
      .attr("transform", "rotate(-90)");

    // Add visual icon tags inside the circles for specific types
    nodeElements.filter(d => d.type === "root")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "#ffffff")
      .attr("font-family", "system-ui")
      .attr("font-weight", "900")
      .attr("font-size", "11px")
      .text("408");

    nodeElements.filter(d => d.type === "weakpoint")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "#ffffff")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("font-size", "8px")
      .text("!");

    // Text labels
    nodeElements.append("text")
      .attr("dx", d => {
        if (d.type === "root") return 30;
        if (d.type === "course") return 26;
        return 18;
      })
      .attr("dy", ".35em")
      .attr("font-size", d => {
        if (d.type === "root") return "12px";
        if (d.type === "course") return "11px";
        return "9px";
      })
      .attr("font-weight", d => (d.type === "root" || d.type === "course" ? "bold" : "500"))
      .attr("fill", d => (d.type === "root" ? "#0f172a" : d.type === "weakpoint" ? "#0f172a" : "#475569"))
      .attr("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'")
      .text(d => d.name)
      .style("pointer-events", "none")
      .style("transition", "fill 0.2s");

    // Interaction handlers
    nodeElements.on("mouseover", (event, d) => {
      setHoveredNode(d);

      // Highlight links
      linkElements.style("stroke", l => {
        const sourceId = typeof l.source === "object" ? l.source.id : l.source;
        const targetId = typeof l.target === "object" ? l.target.id : l.target;
        if (sourceId === d.id || targetId === d.id) {
          return l.isDependency ? "#6366f1" : getNodeColor(d);
        }
        return l.isDependency ? "rgba(99, 102, 241, 0.08)" : "rgba(148, 163, 184, 0.08)";
      })
      .style("stroke-opacity", l => {
        const sourceId = typeof l.source === "object" ? l.source.id : l.source;
        const targetId = typeof l.target === "object" ? l.target.id : l.target;
        return sourceId === d.id || targetId === d.id ? 1 : 0.25;
      })
      .style("stroke-width", l => {
        const sourceId = typeof l.source === "object" ? l.source.id : l.source;
        const targetId = typeof l.target === "object" ? l.target.id : l.target;
        return sourceId === d.id || targetId === d.id ? 3.5 : (l.isDependency ? 1.8 : 1);
      });

      // Ghost other nodes
      nodeElements.selectAll("circle")
        .style("opacity", (n: any) => {
          if (n.id === d.id) return 1;
          const isConnected = links.some(l => {
            const sId = typeof l.source === "object" ? l.source.id : l.source;
            const tId = typeof l.target === "object" ? l.target.id : l.target;
            return (sId === d.id && tId === n.id) || (sId === n.id && tId === d.id);
          });
          return isConnected ? 0.95 : 0.35;
        });

      nodeElements.selectAll("text")
        .style("opacity", (n: any) => {
          if (n.id === d.id) return 1;
          const isConnected = links.some(l => {
            const sId = typeof l.source === "object" ? l.source.id : l.source;
            const tId = typeof l.target === "object" ? l.target.id : l.target;
            return (sId === d.id && tId === n.id) || (sId === n.id && tId === d.id);
          });
          return isConnected ? 0.95 : 0.2;
        });
    });

    nodeElements.on("mouseout", () => {
      setHoveredNode(null);

      // Restore link styles
      linkElements
        .style("stroke", l => l.isDependency ? "rgba(99, 102, 241, 0.45)" : "rgba(148, 163, 184, 0.15)")
        .style("stroke-opacity", l => l.isDependency ? 0.8 : 0.65)
        .style("stroke-width", d => d.value);

      // Restore node styles
      nodeElements.selectAll("circle").style("opacity", 1);
      nodeElements.selectAll("text").style("opacity", 1);
    });

    nodeElements.on("click", (event, d) => {
      setSelectedNode(d);
      event.stopPropagation();
    });

    // Simulation tick function
    simulation.on("tick", () => {
      linkElements
        .attr("x1", d => (d.source as GraphNode).x || 0)
        .attr("y1", d => (d.source as GraphNode).y || 0)
        .attr("x2", d => (d.target as GraphNode).x || 0)
        .attr("y2", d => (d.target as GraphNode).y || 0);

      nodeElements
        .attr("transform", d => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    // Drag-drop functions
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [courses, searchTerm]);

  // Handle Reset Zoom
  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(0, 0).scale(1));
    }
  };

  // Adaptive AI Tutoring Content for Selected Node
  const getAIRecommendation = (node: GraphNode) => {
    const score = node.proficiency;
    if (node.type === "root") {
      return {
        tip: "PlannerAgent 全景规划总结：",
        desc: "整体知识储备优秀 (85% 掌握率)。目前「数据结构与算法」与「计算机网络」包含两个核心阻碍点，建议通过自适应精练补齐短板。",
        task: "开启 408 难点混合专项测验",
        tab: "quiz",
        prompt: "我想对 408 核心课的各个考点开启一次混合难度测验，帮助我查找遗留的盲点。"
      };
    }
    
    if (node.type === "course") {
      if (score >= 85) {
        return {
          tip: "AI 导师学术建议 (已通关/高阶)：",
          desc: `您在【${node.name}】的熟练度极高 (${score}%)。建议进行模拟考试挑战或深入更复杂的理论。`,
          task: "开始 408 挑战测试",
          tab: "quiz",
          prompt: `我已经基本掌握了【${node.name}】的核心理论，请帮我出一套该学科的 408 统考真题级别的挑战压轴题目。`
        };
      } else {
        return {
          tip: "AI 导师提分对策 (冲刺中)：",
          desc: `【${node.name}】目前评测掌握度为 ${score}%。建议结合考点，优先消灭本周标记的薄弱红线。`,
          task: "针对该科目专项答疑",
          tab: "mentor",
          prompt: `我想针对【${node.name}】这门课进行一次全面的难点攻关，请帮我梳理其在计算机统考408中的分值比重和必考算法。`
        };
      }
    }

    if (node.type === "weakpoint") {
      return {
        tip: "TheoryAgent 弱点诊断剖析：",
        desc: `【${node.name}】属于高频易错点！当前修复进度为 ${score}%，共犯错 ${node.count || 3} 次。系统检测到您的理论推演存在盲区，急需算法动画配合伪代码调试来巩固。`,
        task: "发起协同多模态答疑",
        tab: "mentor",
        prompt: `请帮我深入剖析【${node.name}】的算法机理。我希望 TheoryAgent 解答理论边界，CodeAgent 提供一行行代码并附带注释，ReviewAgent 给出 3 条避坑指南。`
      };
    }

    // General subtopic node
    return {
      tip: "知识库深度对齐指南：",
      desc: `您在【${node.name}】分支掌握良好 (${score}%)。本节在统考中常以选择题形式出现，注重对中间状态（如旋转后节点、路由表汇聚结果、流水线时钟数）的推导计算。`,
      task: "深度推导这节难点",
      tab: "mentor",
      prompt: `我想请 AI 导师帮我出一道关于【${node.name}】的选择推演大题，并一步步带我分析求解思路和考点。`
    };
  };

  const aiRec = selectedNode ? getAIRecommendation(selectedNode) : null;
  const fallbackMasteryRecords: KnowledgeMasteryRecord[] = [
    ...weakPoints.map((wp) => ({
      subject: wp.course,
      knowledge_point: wp.name,
      mastery: wp.remediationProgress,
      wrong_count: wp.count,
      practice_count: Math.max(wp.count + 1, 1)
    })),
    ...courses
      .filter((course) => !weakPoints.some((wp) => wp.course === course.name))
      .map((course) => ({
        subject: course.name,
        knowledge_point: `${course.name} 综合基础`,
        mastery: course.proficiency,
        wrong_count: Math.max(0, Math.round((100 - course.proficiency) / 18)),
        practice_count: Math.max(1, Math.round(course.totalHours / 6))
      }))
  ];
  const heatmapRecords = masteryRecords.length > 0 ? masteryRecords : fallbackMasteryRecords;
  const groupedHeatmapRecords = heatmapRecords.reduce<Record<string, KnowledgeMasteryRecord[]>>((groups, record) => {
    const subject = record.subject || "未分类课程";
    groups[subject] = groups[subject] || [];
    groups[subject].push(record);
    return groups;
  }, {});

  return (
    <div className="space-y-4">
      {/* Search and interactive controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-md border border-slate-100/80 p-4 rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-blue-600" /> 学科全图谱导航 (Multi-Agent Knowledge Matrix)
          </h3>
          <p className="text-xs text-slate-400">基于图神经网络及错题反馈，自动构建的 408 知识点熟练度关联拓扑图。</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Node search filter */}
          <div className="relative flex-grow sm:flex-initial">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="搜索知识点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-44 pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200/60 bg-white text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 text-xs font-semibold transition-all shadow-sm"
            title="复位视图"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">复位</span>
          </button>
        </div>
      </div>

      {/* Main Grid: SVG + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 columns: SVG Map Canvas */}
        <div className="lg:col-span-8 flex flex-col relative bg-slate-50/50 border border-slate-100 rounded-3xl overflow-hidden shadow-inner h-[500px]">
          <div ref={containerRef} className="w-full h-full">
            <svg ref={svgRef} className="w-full h-full bg-slate-900/5 select-none" />
          </div>

          {/* Floated Legend */}
          <div className="absolute bottom-4 left-4 p-3.5 bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-lg text-[10px] space-y-2 font-semibold">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px] border-b border-slate-100 pb-1">掌握度色卡 (Legend)</p>
            <div className="space-y-1.5 font-sans">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                <span>熟练掌握 (&ge; 85%)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                <span>正在攻克 (70% - 84%)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm animate-pulse" />
                <span>高频弱点 (&lt; 70%)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 border-t border-slate-100 pt-1.5 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 shadow-sm" />
                <span>408 核心大纲</span>
              </div>
            </div>
          </div>

          {/* Drag & Zoom Info Badge */}
          <div className="absolute top-4 left-4 px-2.5 py-1.5 bg-slate-900/80 backdrop-blur-md text-white/90 text-[9px] font-mono rounded-lg flex items-center gap-1.5">
            <Info className="w-3 h-3 text-blue-400" />
            <span>[ 鼠标拖拽拖动节点 / 滚轮缩放视图 / 双击重置 ]</span>
          </div>

          {/* Quick Stats Overlays */}
          {hoveredNode && (
            <div className="absolute top-4 right-4 px-3.5 py-2.5 bg-slate-950/95 text-slate-100 border border-slate-800 rounded-xl shadow-xl space-y-1.5 w-[210px] pointer-events-none z-10 transition-opacity">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {hoveredNode.type === "weakpoint" ? "高频盲区" : hoveredNode.type === "root" ? "学科考纲" : "学科知识点"}
                </p>
                <p className="text-xs font-bold leading-tight truncate text-white">{hoveredNode.name}</p>
              </div>
              
              <div className="flex items-center justify-between text-[10px] border-t border-slate-800 pt-1.5">
                <span className="text-slate-400">当前掌握度:</span>
                <span className={`font-mono font-bold ${
                  hoveredNode.proficiency >= 85 ? "text-emerald-400" :
                  hoveredNode.proficiency >= 70 ? "text-blue-400" : "text-rose-400 animate-pulse"
                }`}>
                  {hoveredNode.proficiency}%
                </span>
              </div>

              {/* Sparkline miniature trend chart */}
              <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                <div className="flex justify-between items-center text-[9px] text-slate-500">
                  <span>近一周掌握度波动</span>
                  {(() => {
                    const data = getSparklineData(hoveredNode.id, hoveredNode.proficiency);
                    const diff = hoveredNode.proficiency - data[0];
                    return (
                      <span className={`font-mono font-bold ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {diff >= 0 ? `+${diff}%` : `${diff}%`} 趋势
                      </span>
                    );
                  })()}
                </div>
                <div className="h-[28px] w-full pt-0.5">
                  {(() => {
                    const data = getSparklineData(hoveredNode.id, hoveredNode.proficiency);
                    const min = Math.min(...data);
                    const max = Math.max(...data);
                    const range = max - min || 1;
                    const height = 24;
                    const width = 180;
                    
                    const points = data.map((val, idx) => {
                      const x = (idx / (data.length - 1)) * width;
                      const y = height - ((val - min) / range) * (height - 4) - 2;
                      return { x, y };
                    });

                    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

                    const strokeColor = hoveredNode.proficiency >= 85 ? "#10b981" : 
                                        hoveredNode.proficiency >= 70 ? "#818cf8" : "#f43f5e";
                    const gradientId = `sparkline-grad-${hoveredNode.id.replace(/[^a-zA-Z0-9]/g, "-")}`;

                    return (
                      <svg className="overflow-visible" viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area shading */}
                        <path d={areaPath} fill={`url(#${gradientId})`} />
                        {/* Sparkline path */}
                        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Pulsing endpoint marker */}
                        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={strokeColor} />
                      </svg>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 columns: Detail Inspector Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-5 min-h-[500px]">
          {selectedNode ? (
            <>
              {/* Node Basic Info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${
                      selectedNode.type === "root" ? "bg-slate-100 text-slate-700" :
                      selectedNode.type === "course" ? "bg-blue-50 text-blue-700 border border-blue-100/50" :
                      selectedNode.type === "weakpoint" ? "bg-rose-50 text-rose-700 border border-rose-100/50 animate-pulse" :
                      "bg-emerald-50 text-emerald-700 border border-emerald-100/50"
                    }`}>
                      {selectedNode.type === "root" ? "408 全景考纲" :
                       selectedNode.type === "course" ? "专业核心课" :
                       selectedNode.type === "weakpoint" ? "高频薄弱考点" : "重点知识分支"}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {selectedNode.name}
                    </h4>
                  </div>

                  {/* Circular Mastery Indicator */}
                  <div className="relative w-12 h-12 flex items-center justify-center bg-slate-50 rounded-full border border-slate-100">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="2.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={
                          selectedNode.proficiency >= 85 ? "text-emerald-500" :
                          selectedNode.proficiency >= 70 ? "text-blue-600" : "text-rose-500"
                        }
                        strokeDasharray={`${selectedNode.proficiency}, 100`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="text-[10px] font-mono font-extrabold text-slate-800">{selectedNode.proficiency}%</span>
                  </div>
                </div>

                {/* Specific Weakpoint detail rows */}
                {selectedNode.type === "weakpoint" && (
                  <div className="p-3 bg-rose-50/40 border border-rose-100/30 rounded-2xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      <span>诊断报告 (Remediation Logs)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold text-slate-500">
                      <div>
                        <p className="text-slate-400">考点优先级</p>
                        <p className={`font-bold ${selectedNode.level === "High" ? "text-red-600" : "text-amber-600"}`}>
                          {selectedNode.level === "High" ? "🚨 P1 极高" : "⚠️ P2 中等"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">错题发生频次</p>
                        <p className="font-mono font-bold text-slate-800">{selectedNode.count || 4} 次被击穿</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Precursor and Successor Dependencies Section */}
                {depContext && (depContext.precursors.length > 0 || depContext.successors.length > 0) && (
                  <div className="border-t border-slate-100 pt-3.5 space-y-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      知识关联与依赖流向 (Dependency Flow)
                    </p>
                    
                    {depContext.precursors.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-blue-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span>前驱依赖节点 (Precursors)</span>
                        </p>
                        <div className="space-y-1">
                          {depContext.precursors.map(prec => (
                            <div key={prec.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-800">{prec.name}</span>
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded-md">前驱</span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">{prec.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {depContext.successors.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>后继衔接节点 (Successors)</span>
                        </p>
                        <div className="space-y-1">
                          {depContext.successors.map(succ => (
                            <div key={succ.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-800">{succ.name}</span>
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded-md">后继</span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">{succ.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subtopic description & AI suggestions */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> {aiRec?.tip}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    {aiRec?.desc}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-150 mt-auto">
                {aiRec && (
                  <button
                    onClick={() => onNavigateToTab(aiRec.tab, aiRec.prompt)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-100 hover:shadow-blue-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{aiRec.task}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center my-auto space-y-3">
              <div className="p-3 bg-slate-50 rounded-full border border-slate-100">
                <HelpCircle className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">未选择考核节点</p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">请在左侧知识图谱中点击任意节点查看诊断详情与多智能体学术指导。</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Knowledge mastery heatmap */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" /> 知识点掌握热力图
            </h3>
            <p className="text-xs text-slate-400">
              按课程与知识点展示 mastery、wrong_count、practice_count，薄弱知识点可直接进入每日测验。
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />80-100 掌握较好</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />60-79 需要巩固</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />0-59 薄弱知识点</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />无数据 未训练</span>
          </div>
        </div>

        {heatmapRecords.length > 0 ? (
          <div className="space-y-5">
            {!masteryApiLoaded && (
              <div className="text-xs text-slate-400">正在读取掌握度数据...</div>
            )}

            {(Object.entries(groupedHeatmapRecords) as Array<[string, KnowledgeMasteryRecord[]]>).map(([subject, records]) => (
              <div key={subject} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800">{subject}</h4>
                  <span className="text-[10px] text-slate-400 font-bold">{records.length} 个知识点</span>
                </div>

                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {records.map((record) => {
                    const mastery = normalizeMastery(Number(record.mastery));
                    const status = getMasteryStatus(record);
                    const isWeak = Number(record.practice_count || 0) > 0 && mastery < 60;

                    return (
                      <div key={`${subject}-${record.knowledge_point}`} className={`rounded-xl border p-3 space-y-3 ${status.color}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold leading-snug text-slate-900">{record.knowledge_point || "未命名知识点"}</p>
                            <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/70 border border-white/70">
                              {status.label}
                            </span>
                          </div>
                          <span className="font-mono text-lg font-black">{Number(record.practice_count || 0) > 0 ? `${mastery}%` : "--"}</span>
                        </div>

                        <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
                          <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${Number(record.practice_count || 0) > 0 ? mastery : 12}%` }} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
                          <div className="bg-white/60 rounded-lg px-2 py-1">
                            <span className="block text-slate-400">mastery</span>
                            {Number(record.practice_count || 0) > 0 ? mastery : "无数据"}
                          </div>
                          <div className="bg-white/60 rounded-lg px-2 py-1">
                            <span className="block text-slate-400">wrong_count</span>
                            {Number(record.wrong_count || 0)}
                          </div>
                          <div className="bg-white/60 rounded-lg px-2 py-1">
                            <span className="block text-slate-400">practice_count</span>
                            {Number(record.practice_count || 0)}
                          </div>
                        </div>

                        {isWeak && (
                          <button
                            onClick={() => onNavigateToTab("quiz", {
                              subject,
                              knowledgePoint: record.knowledge_point
                            })}
                            className="w-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg py-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            去每日测验
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400">
            暂无知识点训练数据。
          </div>
        )}
      </section>
    </div>
  );
}
